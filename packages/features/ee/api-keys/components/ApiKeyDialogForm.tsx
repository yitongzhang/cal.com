import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import type { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import { API_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { IS_CALCOM } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogFooter } from "@calcom/ui/components/dialog";
import { Form } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { SelectField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { revalidateApiKeysList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/api-keys/actions";

export default function ApiKeyDialogForm({
  defaultValues,
  handleClose,
}: {
  defaultValues?: Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt"> & { neverExpires?: boolean };
  handleClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const updateApiKeyMutation = trpc.viewer.apiKeys.edit.useMutation({
    onSuccess() {
      utils.viewer.apiKeys.list.invalidate();
      revalidateApiKeysList();
      showToast(t("api_key_updated"), "success");
      handleClose();
    },
    onError() {
      showToast(t("api_key_update_failed"), "error");
    },
  });
  type Option = { value: Date | null | undefined; label: string };
  const [apiKey, setApiKey] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | null | undefined>(
    () => defaultValues?.expiresAt || dayjs().add(30, "day").toDate()
  );
  const [successfulNewApiKeyModal, setSuccessfulNewApiKeyModal] = useState(false);
  const [hasCopiedKey, setHasCopiedKey] = useState(false);
  const [apiKeyDetails, setApiKeyDetails] = useState({
    expiresAt: null as Date | null,
    note: "" as string | null,
    neverExpires: false,
  });

  const form = useForm({
    defaultValues: {
      note: defaultValues?.note || "",
      neverExpires: defaultValues?.neverExpires || false,
      expiresAt: defaultValues?.expiresAt || dayjs().add(30, "day").toDate(),
    },
    mode: "onChange",
    criteriaMode: "all",
    resolver: (values) => {
      const errors: { note?: { type: string; message: string } } = {};
      if (values.note && values.note.length > API_NAME_LENGTH_MAX_LIMIT) {
        errors.note = {
          type: "maxLength",
          message: t("api_key_name_too_long", { max: API_NAME_LENGTH_MAX_LIMIT }),
        };
      }
      return { values, errors };
    },
  });
  const watchNeverExpires = form.watch("neverExpires");

  const expiresAtOptions: Option[] = [
    {
      label: t("seven_days"),
      value: dayjs().add(7, "day").toDate(),
    },
    {
      label: t("thirty_days"),
      value: dayjs().add(30, "day").toDate(),
    },
    {
      label: t("three_months"),
      value: dayjs().add(3, "month").toDate(),
    },
    {
      label: t("one_year"),
      value: dayjs().add(1, "year").toDate(),
    },
    {
      label: t("never_expires"),
      value: null,
    },
  ];

  return (
    <LicenseRequired>
      {successfulNewApiKeyModal ? (
        <>
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="bg-success rounded-full p-2">
                <Icon name="check" className="text-inverted stroke-[3px]" size={16} />
              </div>
              <h2 className="font-semi-bold font-cal text-emphasis text-xl tracking-wide">
                {t("success_api_key_created")}
              </h2>
            </div>
            <div className="bg-attention/10 border-attention rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <Icon name="triangle-alert" className="text-attention mt-0.5 shrink-0" size={16} />
                <div className="text-sm">
                  <span className="text-emphasis font-semibold">{t("success_api_key_created_bold_tagline")}</span>{" "}
                  <span className="text-default">{t("you_will_only_view_it_once")}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {apiKeyDetails.note && (
              <div>
                <label className="text-subtle mb-1 block text-xs font-medium uppercase tracking-wide">
                  {t("personal_note")}
                </label>
                <p className="text-emphasis text-sm font-medium">{apiKeyDetails.note}</p>
              </div>
            )}
            <div>
              <label className="text-subtle mb-1 block text-xs font-medium uppercase tracking-wide">
                {t("api_key")}
              </label>
              <div className="flex">
                <code className="bg-subtle text-default inline-flex w-full items-center truncate rounded-md rounded-r-none border border-r-0 py-2 pl-3 pr-2 font-mono text-sm">
                  {apiKey}
                </code>
                <Tooltip side="top" content={hasCopiedKey ? t("copied") : t("copy_to_clipboard")}>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey);
                      setHasCopiedKey(true);
                      showToast(t("api_key_copied"), "success");
                    }}
                    type="button"
                    color={hasCopiedKey ? "secondary" : "primary"}
                    className="rounded-l-none text-base"
                    StartIcon={hasCopiedKey ? "check" : "clipboard"}>
                    {hasCopiedKey ? t("copied") : t("copy")}
                  </Button>
                </Tooltip>
              </div>
            </div>
            <div>
              <label className="text-subtle mb-1 block text-xs font-medium uppercase tracking-wide">
                {t("expiration")}
              </label>
              <p className="text-emphasis text-sm">
                {apiKeyDetails.neverExpires
                  ? t("never_expires")
                  : `${t("expires")} ${apiKeyDetails?.expiresAt?.toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <DialogFooter showDivider className="relative">
            <Button type="button" color="secondary" onClick={handleClose} tabIndex={-1}>
              {t("done")}
            </Button>
          </DialogFooter>
        </>
      ) : (
        <Form
          form={form}
          handleSubmit={async (event) => {
            if (defaultValues) {
              await updateApiKeyMutation.mutate({ id: defaultValues.id, note: event.note });
            } else {
              const apiKey = await utils.client.viewer.apiKeys.create.mutate(event);
              setApiKey(apiKey);
              setApiKeyDetails({ ...event });
              await utils.viewer.apiKeys.list.invalidate();
              revalidateApiKeysList();
              setSuccessfulNewApiKeyModal(true);
            }
          }}
          className="stack-y-4">
          <div className="mb-4 mt-1">
            <h2 className="font-semi-bold font-cal text-emphasis text-xl tracking-wide">
              {defaultValues ? t("edit_api_key") : t("create_api_key")}
            </h2>
            {IS_CALCOM ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <div className="border-emphasis relative flex w-full items-start rounded-[10px] border p-4 text-sm">
                  {t("api_key_modal_subtitle")}
                </div>
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://cal.com/platform"
                  className="border-subtle relative flex w-full items-start rounded-[10px] border p-4 text-sm">
                  {t("api_key_modal_subtitle_platform")}
                </Link>
              </div>
            ) : (
              <p className="text-subtle mb-5 mt-1 text-sm">{t("api_key_modal_subtitle")}</p>
            )}
          </div>

          <div>
            <Controller
              name="note"
              control={form.control}
              render={({ field: { value } }) => (
                <TextField
                  name="note"
                  label={t("personal_note")}
                  placeholder={t("personal_note_placeholder")}
                  value={value}
                  onChange={(e) => {
                    form.setValue("note", e?.target.value);
                  }}
                  type="text"
                />
              )}
            />
          </div>
          {!defaultValues && (
            <div className="flex flex-col">
              <Controller
                name="expiresAt"
                render={({ field: { onChange } }) => {
                  const defaultValue = expiresAtOptions[1];

                  return (
                    <SelectField
                      label={t("expiration_policy")}
                      styles={{
                        singleValue: (baseStyles) =>
                          Object.assign({}, baseStyles, {
                            fontSize: "14px",
                          }),
                        option: (baseStyles) =>
                          Object.assign({}, baseStyles, {
                            fontSize: "14px",
                          }),
                      }}
                      isDisabled={!!defaultValues}
                      containerClassName="data-testid-field-type"
                      options={expiresAtOptions}
                      onChange={(option) => {
                        if (option === undefined) {
                          return;
                        }
                        if (option?.value === null) {
                          form.setValue("neverExpires", true);
                          setExpiryDate(null);
                        } else {
                          form.setValue("neverExpires", false);
                          setExpiryDate(option?.value);
                        }
                        onChange(option?.value);
                      }}
                      defaultValue={defaultValue}
                    />
                  );
                }}
              />
              {!watchNeverExpires && expiryDate && (
                <span className="text-subtle mt-2 text-xs">
                  {t("api_key_expires_on")}
                  <span className="font-bold"> {dayjs(expiryDate).format("DD-MM-YYYY")}</span>
                </span>
              )}
            </div>
          )}

          <DialogFooter showDivider className="relative">
            <Button type="button" color="secondary" onClick={handleClose} tabIndex={-1}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {apiKeyDetails ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </Form>
      )}
    </LicenseRequired>
  );
}
