import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";
import { supabaseLogin, supabaseRegister, supabaseLogout } from "../lib/supabase";

export type Role = "applicant" | "employer" | "verifier" | "admin";

interface User {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;

  login:    (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload)           => Promise<void>;
  logout:   ()                                => Promise<void>;
  setUser:  (user: User)                      => void;
}

export interface RegisterPayload {
  email:       string;
  password:    string;
  fullName:    string;
  role:        "applicant" | "employer" | "verifier";
  phone:      string;
  companyName:    string;
  companyLocation:string;
  industry:   string;
  website:    string;
  institutionName: string;
  institutionCategory: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:        null,
      accessToken: null,
      isLoading:   false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { user: authUser, session } = await supabaseLogin(email, password);
          const { accessToken, user } = await api.auth.login({
            supabaseUserId: authUser.id,
            supabaseAccessToken: session.access_token,
          });
          localStorage.setItem("accessToken", accessToken);
          document.cookie = `accessToken=${accessToken}; path=/; max-age=900; SameSite=Lax`;
          set({ user, accessToken, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const { email, password, fullName, role, phone,
                  companyName, companyLocation, industry, website,
                  institutionName, institutionCategory } = data;
          const { user: authUser, session } = await supabaseRegister(email, password, fullName);
          if (!authUser) throw new Error("Supabase did not return a registered user.");
          await api.auth.register({
            supabaseUserId: authUser.id, email, fullName, role, phone,
            companyName, companyLocation, industry, website: website || undefined,
            institutionName, institutionCategory,
          });
          if (session) {
            const { accessToken, user } = await api.auth.login({
              supabaseUserId: authUser.id,
              supabaseAccessToken: session.access_token,
            });
            localStorage.setItem("accessToken", accessToken);
            document.cookie = `accessToken=${accessToken}; path=/; max-age=900; SameSite=Lax`;
            set({ user, accessToken, isLoading: false });
          } else {
            set({ isLoading: false });
            throw new Error("Account created. Confirm your email before logging in.");
          }
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        await supabaseLogout().catch(() => {});
        await api.auth.logout().catch(() => {});
        localStorage.removeItem("accessToken");
        document.cookie = "accessToken=; path=/; max-age=0; SameSite=Lax";
        set({ user: null, accessToken: null });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "zimrecruit-auth",
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
);
