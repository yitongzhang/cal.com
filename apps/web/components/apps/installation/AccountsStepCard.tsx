import type { FC } from "react";
import React, { useState } from "react";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { StepCard } from "@calcom/ui/components/card";
import { Icon } from "@calcom/ui/components/icon";

import type { TTeams } from "~/apps/installation/[[...step]]/step-view";

export type PersonalAccountProps = Pick<User, "id" | "avatarUrl" | "name"> & { alreadyInstalled: boolean };

type AccountStepCardProps = {
  teams?: TTeams;
  personalAccount: PersonalAccountProps;
  onSelect: (id?: number) => void;
  loading: boolean;
  installableOnTeams: boolean;
};

type AccountSelectorProps = {
  avatar?: string;
  name: string;
  alreadyInstalled: boolean;
  onClick?: () => void;
  loading: boolean;
  testId: string;
  isTeam?: boolean;
};

const AccountSelector: FC<AccountSelectorProps> = ({
  avatar,
  alreadyInstalled,
  name,
  onClick,
  loading,
  testId,
  isTeam = false,
}) => {
  const { t } = useLocale();
  const [selected, setSelected] = useState(false);
  const isSelecting = selected && loading;

  return (
    <div
      className={classNames(
        "hover:bg-muted flex cursor-pointer flex-row items-center justify-between gap-2 rounded-md border p-3 transition-all duration-200",
        "border-subtle hover:border-emphasis",
        (alreadyInstalled || loading) && "cursor-not-allowed opacity-60",
        isSelecting && "bg-muted border-emphasis animate-pulse",
        !alreadyInstalled && !loading && "hover:shadow-sm"
      )}
      data-testid={testId}
      onClick={() => {
        if (!alreadyInstalled && !loading && onClick) {
          setSelected(true);
          onClick();
        }
      }}>
      <div className="flex items-center gap-3">
        <Avatar
          alt={avatar || ""}
          imageSrc={getPlaceholderAvatar(avatar, name)}
          size="sm"
        />
        <div className="flex flex-col">
          <div className="text-emphasis text-sm font-medium">{name}</div>
          <div className="text-subtle text-xs">
            {isTeam ? t("team_account") : t("personal_account")}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {alreadyInstalled ? (
          <Badge variant="success" className="flex items-center gap-1">
            <Icon name="check" className="h-3 w-3" />
            {t("installed")}
          </Badge>
        ) : isSelecting ? (
          <div className="flex items-center gap-2 text-sm text-emphasis">
            <Icon name="loader" className="h-4 w-4 animate-spin" />
            {t("connecting")}
          </div>
        ) : (
          <Icon name="chevron-right" className="text-subtle h-4 w-4" />
        )}
      </div>
    </div>
  );
};

export const AccountsStepCard: FC<AccountStepCardProps> = ({
  teams,
  personalAccount,
  onSelect,
  loading,
  installableOnTeams,
}) => {
  const { t } = useLocale();
  return (
    <StepCard>
      <div className="mb-4">
        <div className="text-emphasis text-sm font-medium">{t("install_app_on")}</div>
        <p className="text-subtle mt-1 text-xs">
          {t("select_account_to_install_app")}
        </p>
      </div>
      <div className={classNames("flex flex-col gap-2")}>
        <AccountSelector
          testId="install-app-button-personal"
          avatar={personalAccount.avatarUrl ?? ""}
          name={personalAccount.name ?? ""}
          alreadyInstalled={personalAccount.alreadyInstalled}
          onClick={() => onSelect()}
          loading={loading}
          isTeam={false}
        />
        {installableOnTeams &&
          teams?.map((team) => (
            <AccountSelector
              key={team.id}
              testId={`install-app-button-team${team.id}`}
              alreadyInstalled={team.alreadyInstalled}
              avatar={team.logoUrl ?? ""}
              name={team.name}
              onClick={() => onSelect(team.id)}
              loading={loading}
              isTeam={true}
            />
          ))}
      </div>

      {/* Help text for team installs */}
      {installableOnTeams && teams && teams.length > 0 && (
        <div className="bg-subtle mt-4 flex items-start gap-2 rounded-md p-3">
          <Icon name="info" className="text-subtle mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-subtle text-xs">
            {t("team_install_info")}
          </p>
        </div>
      )}
    </StepCard>
  );
};
