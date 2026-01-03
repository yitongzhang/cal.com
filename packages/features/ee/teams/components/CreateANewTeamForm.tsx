"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import posthog from "posthog-js";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { DialogFooter } from "@calcom/ui/components/dialog";
import { Form } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import classNames from "@calcom/ui/classNames";
import { revalidateEventTypesList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/event-types/actions";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";

import { useOrgBranding } from "../../organizations/context/provider";
import { subdomainSuffix } from "../../organizations/lib/orgDomains";
import type { NewTeamFormValues } from "../lib/types";

type SlugValidationState = "idle" | "checking" | "available" | "taken";

interface CreateANewTeamFormProps {
  onCancel: () => void;
  submitLabel: string;
  onSuccess: (data: RouterOutputs["viewer"]["teams"]["create"]) => void;
  inDialog?: boolean;
  slug?: string;
}

export const CreateANewTeamForm = (props: CreateANewTeamFormProps) => {
  const { inDialog, onCancel, slug, submitLabel, onSuccess } = props;
  const { t, isLocaleReady } = useLocale();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [slugValidationState, setSlugValidationState] = useState<SlugValidationState>("idle");
  const [slugErrorMessage, setSlugErrorMessage] = useState<string>("");
  const slugCheckTimeoutRef = useRef<NodeJS.Timeout>();
  const orgBranding = useOrgBranding();

  const newTeamFormMethods = useForm<NewTeamFormValues>({
    defaultValues: {
      slug,
    },
  });

  const currentSlug = newTeamFormMethods.watch("slug");

  const utils = trpc.useUtils();

  const validateSlug = useCallback(
    async (slugToCheck: string) => {
      if (!slugToCheck || slugToCheck.trim() === "") {
        setSlugValidationState("idle");
        setSlugErrorMessage("");
        return;
      }

      setSlugValidationState("checking");

      try {
        const result = await utils.viewer.teams.checkSlugAvailability.fetch({ slug: slugToCheck });
        if (result.available) {
          setSlugValidationState("available");
          setSlugErrorMessage("");
        } else {
          setSlugValidationState("taken");
          setSlugErrorMessage(result.message ? t(result.message) : t("url_taken"));
        }
      } catch {
        // On error, we still allow submission - server will validate
        setSlugValidationState("idle");
        setSlugErrorMessage("");
      }
    },
    [utils, t]
  );

  // Debounce slug validation
  useEffect(() => {
    if (slugCheckTimeoutRef.current) {
      clearTimeout(slugCheckTimeoutRef.current);
    }

    slugCheckTimeoutRef.current = setTimeout(() => {
      validateSlug(currentSlug || "");
    }, 500);

    return () => {
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current);
      }
    };
  }, [currentSlug, validateSlug]);

  const createTeamMutation = trpc.viewer.teams.create.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.eventTypes.getUserEventGroups.invalidate();
      revalidateEventTypesList();
      revalidateTeamsList();
      onSuccess(data);
    },

    onError: (err) => {
      if (err.message === "team_url_taken") {
        newTeamFormMethods.setError("slug", { type: "custom", message: t("url_taken") });
      } else {
        setServerErrorMessage(err.message);
      }
    },
  });

  const FormButtons = () => (
    <>
      <Button
        disabled={createTeamMutation.isPending}
        color="secondary"
        onClick={onCancel}
        className="w-full justify-center">
        {t("cancel")}
      </Button>
      <Button
        disabled={
          newTeamFormMethods.formState.isSubmitting ||
          createTeamMutation.isPending ||
          slugValidationState === "taken"
        }
        color="primary"
        EndIcon="arrow-right"
        type="submit"
        className="w-full justify-center"
        data-testid="continue-button">
        {t(submitLabel)}
      </Button>
    </>
  );

  return (
    <>
      <Form
        form={newTeamFormMethods}
        handleSubmit={(v) => {
          if (!createTeamMutation.isPending) {
            posthog.capture("create_team_checkout_clicked", {
              team_name: v.name,
              team_slug: v.slug,
            });
            setServerErrorMessage(null);
            createTeamMutation.mutate(v);
          }
        }}>
        <div className="mb-8">
          {serverErrorMessage && (
            <div className="mb-4">
              <Alert severity="error" message={t(serverErrorMessage)} />
            </div>
          )}

          <Controller
            name="name"
            control={newTeamFormMethods.control}
            defaultValue=""
            rules={{
              required: t("must_enter_team_name"),
              validate: (value) => value.trim().length > 0 || t("must_enter_team_name")
            }}
            render={({ field: { value } }) => (
              <>
                <TextField
                  disabled={
                    /* E2e is too fast and it tries to fill this way before the form is ready */
                    !isLocaleReady || createTeamMutation.isPending
                  }
                  className="mt-2"
                  placeholder="Acme Inc."
                  name="name"
                  label={t("team_name")}
                  defaultValue={value}
                  onChange={(e) => {
                    newTeamFormMethods.setValue("name", e?.target.value);
                    if (newTeamFormMethods.formState.touchedFields["slug"] === undefined) {
                      newTeamFormMethods.setValue("slug", slugify(e?.target.value));
                    }
                  }}
                  autoComplete="off"
                  data-testid="team-name"
                />
              </>
            )}
          />
        </div>

        <div className="mb-8">
          <Controller
            name="slug"
            control={newTeamFormMethods.control}
            rules={{ required: t("team_url_required") }}
            render={({ field: { value } }) => (
              <div className="flex flex-col gap-1">
                <TextField
                  name="slug"
                  placeholder="acme"
                  label={t("team_url")}
                  addOnLeading={`${
                    orgBranding
                      ? `${orgBranding.fullDomain.replace("https://", "").replace("http://", "")}/`
                      : `${subdomainSuffix()}/team/`
                  }`}
                  addOnSuffix={
                    slugValidationState === "checking" ? (
                      <Icon name="loader" className="text-subtle h-4 w-4 animate-spin" />
                    ) : slugValidationState === "available" ? (
                      <Icon name="check" className="text-success h-4 w-4" />
                    ) : slugValidationState === "taken" ? (
                      <Icon name="x" className="text-error h-4 w-4" />
                    ) : undefined
                  }
                  value={value}
                  defaultValue={value}
                  className={classNames(slugValidationState === "taken" && "border-error")}
                  onChange={(e) => {
                    newTeamFormMethods.setValue("slug", slugify(e?.target.value, true).replace(/\./g, ""), {
                      shouldTouch: true,
                    });
                    newTeamFormMethods.clearErrors("slug");
                    // Reset validation state when user types
                    setSlugValidationState("idle");
                  }}
                />
                {slugValidationState === "taken" && slugErrorMessage && (
                  <p className="text-error text-sm">{slugErrorMessage}</p>
                )}
                {slugValidationState === "available" && currentSlug && (
                  <p className="text-success text-sm">{t("url_available") || "This URL is available"}</p>
                )}
              </div>
            )}
          />
        </div>

        {inDialog ? (
          <DialogFooter>
            <div className="flex space-x-2 rtl:space-x-reverse">
              <FormButtons />
            </div>
          </DialogFooter>
        ) : (
          <div className="flex space-x-2 rtl:space-x-reverse">
            <FormButtons />
          </div>
        )}
      </Form>
    </>
  );
};
