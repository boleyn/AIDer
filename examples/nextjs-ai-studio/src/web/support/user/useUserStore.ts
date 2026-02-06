import { create, devtools, persist, immer } from '@fastgpt/web/common/zustand';

import type { UserUpdateParams } from '@/types/user';
import { getTokenLogin, putUserInfo } from '@/web/support/user/api';
import { setToken } from '@/web/support/user/token';
import type { OrgType } from '@fastgpt/global/support/user/team/org/type';
import type { UserType } from '@fastgpt/global/support/user/type';
import type { ClientTeamPlanStatusType } from '@fastgpt/global/support/wallet/sub/type';
import { getTeamPlanStatus } from './team/api';
import { setLangToStorage, getLangMapping } from '@/web/i18n/utils';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';

type State = {
  systemMsgReadId: string;
  setSysMsgReadId: (id: string) => void;

  isUpdateNotification: boolean;
  setIsUpdateNotification: (val: boolean) => void;

  userInfo: UserType | null;
  isTeamAdmin: boolean;
  initUserInfo: () => Promise<any>;
  setUserInfo: (user: UserType | null) => void;
  updateUserInfo: (user: UserUpdateParams) => Promise<void>;

  teamPlanStatus: ClientTeamPlanStatusType | null;
  initTeamPlanStatus: () => Promise<any>;

  teamOrgs: OrgType[];
};

const normalizeUserPermission = (user: UserType | null): UserType | null => {
  if (!user) return null;
  const teamPermission = new TeamPermission({
    role: user?.team?.permission?.role,
    isOwner: user?.team?.permission?.isOwner
  });
  return {
    ...user,
    team: {
      ...user.team,
      permission: teamPermission
    },
    permission: teamPermission
  };
};

let setStateFn: any;

export const useUserStore = create<State>()(
  devtools(
    persist(
      immer((set, get) => {
        setStateFn = set;
        return {
          systemMsgReadId: '',
          setSysMsgReadId(id: string) {
            set((state) => {
              state.systemMsgReadId = id;
            });
          },

          isUpdateNotification: true,
          setIsUpdateNotification(val: boolean) {
            set((state) => {
              state.isUpdateNotification = val;
            });
          },

          userInfo: null,
          isTeamAdmin: false,
          async initUserInfo() {
            get().initTeamPlanStatus();
            try {
              const res = await getTokenLogin();
              const { token, ...user } = res as UserType & { token?: string };
              if (token) {
                setToken(token);
              }
              get().setUserInfo(user);

              //设置html的fontsize
              const html = document?.querySelector('html');
              if (html) {
                // html.style.fontSize = '16px';
              }

              return res;
            } catch (error) {
              console.log('[Init user] error', error);
              throw error;
            }
          },
          setUserInfo(user: UserType | null) {
            set((state) => {
              const normalized = normalizeUserPermission(user);
              state.userInfo = normalized;
              state.isTeamAdmin = !!normalized?.team?.permission?.hasManagePer;
              const lang = user?.language;
              if (lang) {
                const mappedLang = getLangMapping(lang);
                setLangToStorage(mappedLang);
              }
            });
          },
          async updateUserInfo(user: UserUpdateParams) {
            const oldInfo = (get().userInfo ? { ...get().userInfo } : null) as UserType | null;
            set((state) => {
              if (!state.userInfo) return;
              state.userInfo = normalizeUserPermission({
                ...state.userInfo,
                ...user
              } as UserType);
            });
            try {
              await putUserInfo(user);
            } catch (error) {
              set((state) => {
                state.userInfo = oldInfo;
              });
              return Promise.reject(error);
            }
          },
          // team
          teamPlanStatus: null,
          async initTeamPlanStatus() {
            return getTeamPlanStatus().then((res) => {
              set((state) => {
                state.teamPlanStatus = res;
              });
              return res;
            });
          },
          teamMemberGroups: [],
          teamOrgs: []
        };
      }),
      {
        name: 'userStore',
        partialize: (state) => ({
          systemMsgReadId: state.systemMsgReadId,
          isUpdateNotification: state.isUpdateNotification,
          userInfo: state.userInfo // 持久化用户信息以保持登录状态
        }),
        onRehydrateStorage: () => {
          return (state, error) => {
            if (error || !setStateFn) return;
            setStateFn((draft: State) => {
              draft.userInfo = normalizeUserPermission((state as any)?.userInfo ?? null);
              draft.isTeamAdmin = !!draft.userInfo?.team?.permission?.hasManagePer;
            });
          };
        }
      }
    )
  )
);
