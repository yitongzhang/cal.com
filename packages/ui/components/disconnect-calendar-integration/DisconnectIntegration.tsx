import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { ButtonProps } from "../button/Button";
import { Button } from "../button/Button";
import { ConfirmationDialogContent } from "../dialog/ConfirmationDialogContent";
import { Dialog, DialogTrigger } from "../dialog/Dialog";
import { Icon } from "../icon";

export const DisconnectIntegrationComponent = ({
  label,
  trashIcon,
  isGlobal,
  isModalOpen = false,
  onModalOpen,
  onDeletionConfirmation,
  buttonProps,
  disabled,
  appName,
}: {
  label?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  isModalOpen: boolean;
  onModalOpen: () => void;
  onDeletionConfirmation: () => void;
  buttonProps?: ButtonProps;
  disabled?: boolean;
  appName?: string;
}) => {
  const { t } = useLocale();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConfirm = async () => {
    setIsDisconnecting(true);
    try {
      await onDeletionConfirmation();
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={onModalOpen}>
        <DialogTrigger asChild>
          <Button
            color={buttonProps?.color || "destructive"}
            StartIcon={!trashIcon ? undefined : "trash"}
            size="base"
            variant={trashIcon && !label ? "icon" : "button"}
            disabled={isGlobal || disabled}
            {...buttonProps}>
            {label}
          </Button>
        </DialogTrigger>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_app")}
          confirmBtnText={isDisconnecting ? t("disconnecting") : t("yes_remove_app")}
          isPending={isDisconnecting}
          onConfirm={handleConfirm}>
          <div className="mt-4 space-y-4">
            <div className="bg-error/10 flex items-start gap-3 rounded-md p-3">
              <Icon name="circle-alert" className="text-error mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-emphasis font-medium">
                  {t("are_you_sure_you_want_to_remove_this_app")}
                </p>
                {appName && (
                  <p className="text-subtle mt-1">
                    {t("disconnecting_app_warning", { appName })}
                  </p>
                )}
              </div>
            </div>

            <div className="text-subtle text-sm">
              <p className="font-medium text-emphasis mb-2">{t("what_happens_when_disconnected")}</p>
              <ul className="list-inside list-disc space-y-1">
                <li>{t("disconnect_warning_credentials")}</li>
                <li>{t("disconnect_warning_events")}</li>
                <li>{t("disconnect_warning_reconnect")}</li>
              </ul>
            </div>
          </div>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};
