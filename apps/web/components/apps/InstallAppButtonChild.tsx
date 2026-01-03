import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { AppFrontendPayload } from "@calcom/types/App";
import type { ButtonProps } from "@calcom/ui/components/button";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

type InstallState = "not_installed" | "installing" | "installed" | "error";

export const InstallAppButtonChild = ({
  multiInstall,
  credentials,
  paid,
  installState,
  errorMessage,
  ...props
}: {
  multiInstall?: boolean;
  credentials?: RouterOutputs["viewer"]["apps"]["appCredentialsByType"]["credentials"];
  paid?: AppFrontendPayload["paid"];
  installState?: InstallState;
  errorMessage?: string;
} & ButtonProps) => {
  const { t } = useLocale();

  const shouldDisableInstallation = !multiInstall ? !!(credentials && credentials.length) : false;
  const isDisabled = shouldDisableInstallation || props.disabled;
  const isLoading = props.loading || installState === "installing";

  // Determine button text based on state
  const getButtonText = () => {
    if (isLoading) {
      return t("installing");
    }
    if (paid) {
      return paid.trial ? t("start_paid_trial") : t("subscribe");
    }
    return multiInstall ? t("install_another") : t("install_app");
  };

  // Determine button icon based on state
  const getStartIcon = () => {
    if (isLoading) {
      return undefined; // Loading spinner handled by Button component
    }
    if (paid) {
      return paid.trial ? "clock" : "credit-card";
    }
    return "plus";
  };

  // Show error state with tooltip
  if (installState === "error" && errorMessage) {
    return (
      <Tooltip content={errorMessage}>
        <Button
          data-testid="install-app-button"
          {...props}
          disabled={isDisabled}
          color="destructive"
          size="base"
          StartIcon="circle-alert">
          {t("installation_failed")}
        </Button>
      </Tooltip>
    );
  }

  // Paid apps don't support team installs at the moment
  // Also, cal.ai(the only paid app at the moment) doesn't support team install either
  if (paid) {
    return (
      <Button
        data-testid="install-app-button"
        {...props}
        disabled={isDisabled}
        loading={isLoading}
        color="primary"
        size="base"
        StartIcon={getStartIcon() as "clock" | "credit-card" | undefined}>
        {getButtonText()}
        {paid.trial && (
          <span className="text-muted ml-1.5 text-xs font-normal">
            ({paid.trial} {t("days_free")})
          </span>
        )}
      </Button>
    );
  }

  return (
    <Button
      data-testid="install-app-button"
      {...props}
      disabled={isDisabled}
      loading={isLoading}
      color="primary"
      size="base"
      StartIcon={isLoading ? undefined : "plus"}>
      {getButtonText()}
    </Button>
  );
};
