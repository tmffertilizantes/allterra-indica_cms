import { apiUrl } from "../lib/api";
import { DateColumnFilter, NoFilter, PostType } from "@components";
import { NextPage } from "next";
import { useGlobal } from "@context/global";
import axios, { AxiosResponse } from "axios";
import LayoutDefault from "@components/Layouts/default";
import Select from "react-select";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { ColumnFn } from "models/ColumnFn";
import EditButton from "@components/Utils/Buttons/EditButton";
import RemoveButton from "@components/Utils/Buttons/RemoveButton";
import StatusButton from "@components/Utils/Buttons/StatusButton";
import { Form } from "react-bootstrap";
import { AlertError, AlertItemCreated, AlertItemEdited, AlertItemRemoved } from "@components/Alerts/Alerts";
import Swal from "sweetalert2";
import {
  createAdmin,
  deleteUser,
  fetchAllUsers,
  fetchRoles,
  isUserV2,
  serverMessage,
  setActive,
  setApproval,
  updateUser,
} from "../lib/users";

const ADMIN_ROLE_NAMES = ["admin", "super-admin"];

interface CustomComponent {
  post: any;
  setPost: Function;
}

const Page: NextPage = () => {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/user`);
  const register_url = apiUrl(`/auth/register`);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordIsValid, setPasswordIsValid] = useState<boolean | undefined>();
  const [confirmPasswordIsValid, setConfirmPasswordIsValid] = useState<
    boolean | undefined
  >();

  // Papéis: v1 `GET /role`; v2 `GET /admin/roles` (specs/016 — FR-023).
  const { data: roles } = useSWR(["roles", isUserV2(), token], () => fetchRoles());

  /** Administradores pelo NOME do papel (admin e super-admin — nível administrativo único). */
  const isAdmin = (user: { roleId: number; role?: { name: string } }) => {
    if (user.role?.name) return ADMIN_ROLE_NAMES.includes(user.role.name);
    const adminIds = (roles ?? [])
      .filter((role: { name: string }) => ADMIN_ROLE_NAMES.includes(role.name))
      .map((role: { id: number }) => role.id);
    return adminIds.length ? adminIds.includes(user.roleId) : user.roleId === 2 || user.roleId === 1;
  };

  /** Lista atual de administradores (v1 e v2), no formato que a tabela espera. */
  const loadAdmins = async () => (await fetchAllUsers()).filter(isAdmin);

  // Status de aprovação carregado, para só chamar approve/disapprove quando ele mudar.
  const loadedStatus: Record<number, string | null> = {};

  const v2Fetcher = async () => {
    const admins = await loadAdmins();
    admins.forEach((admin: any) => (loadedStatus[admin.id] = admin.status));
    return admins;
  };

  const v2Insert = async (_insertUrl = "", _url = "", _options = {}, post: any = {}) => {
    try {
      await createAdmin(post);
      AlertItemCreated();
    } catch (error) {
      Swal.fire({ icon: "error", title: "Erro", text: serverMessage(error, "Não foi possível criar o administrador") });
    }
    return v2Fetcher();
  };

  const v2Update = async (_updateUrl = "", _url = "", _options = {}, post: any = {}) => {
    try {
      // Botão de status da tabela: só { id, active }.
      if (Object.keys(post).length === 2 && "active" in post) {
        await setActive(post.id, post.active);
      } else {
        await updateUser(post.id, post);
        const approved = post.status === "approved";
        if (approved !== (loadedStatus[post.id] === "approved")) await setApproval(post.id, approved);
      }
      AlertItemEdited();
    } catch (error) {
      Swal.fire({ icon: "error", title: "Erro", text: serverMessage(error, "Não foi possível salvar") });
    }
    return v2Fetcher();
  };

  const v2Remove = async (removeUrl = "", _url = "", _options = {}) => {
    try {
      await deleteUser(Number(removeUrl.split("/").pop()));
      AlertItemRemoved();
    } catch (error) {
      Swal.fire({ icon: "error", title: "Erro", text: serverMessage(error, "Não foi possível excluir") });
    }
    return v2Fetcher();
  };

  const roles_as_options = useMemo(
    () =>
      roles?.map((role: { id: any; name: any }) => ({
        value: role.id,
        label: role.name,
      })) || [],
    [roles]
  );

  function validatePassword(pass: string) {
    if (pass.length > 0 && pass.length < 8) {
      setPasswordIsValid(false);
    } else {
      setPasswordIsValid(true);
    }
  }

  function passwordsAreTheSame(pass1: string, pass2: string) {
    if (pass1 == pass2) {
      return true;
    }
    return false;
  }

  const fields = [
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label">Aprovar Administrador</label>

          <Form.Check
            type="switch"
            id="custom-switch"
            checked={post.status === "approved"}
            onChange={(event) => {
              var user_status = "";

              if (event.target.checked) {
                user_status = "approved";
              } else {
                user_status = "";
              }

              setPost({
                ...post,
                status: user_status,
              });
            }}
          />
        </div>
      ),
    },
    {
      field: "name",
      label: "Nome",
      placeholder: "Exemplo",
    },
    {
      field: "email",
      label: "Email",
      placeholder: "email@email.com.br",
    },
    {
      field: "phone",
      label: "Telefone",
      placeholder: "(11) 91234-5678",
    },
    {
      field: "password",
      label: "Senha",
      type: "password",
      isValid: passwordIsValid,
      errorMessage: "A senha precisa ter no mínimo 8 caracteres",
      customEvents: (setUser: (arg0: (user: any) => any) => any) => ({
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setUser((user) => ({
            ...user,
            password: e.target.value,
          }));

          setPassword(e.target.value);

          if (passwordsAreTheSame(confirmPassword, e.target.value)) {
            setConfirmPasswordIsValid(true);
          } else {
            setConfirmPasswordIsValid(false);
          }

          validatePassword(e.target.value);
        },
      }),
    },
    {
      field: "confirm_password",
      label: "Confirmar Senha",
      type: "password",
      isValid: confirmPasswordIsValid,
      errorMessage: "Senhas incompatíveis",
      customEvents: () => ({
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setConfirmPassword(e.target.value);
          if (passwordsAreTheSame(password, e.target.value)) {
            setConfirmPasswordIsValid(true);
          } else {
            setConfirmPasswordIsValid(false);
          }
        },
      }),
    },
  ];

  const colunas =
    ({ onUpdate, onRemove, getPost, onStatusChange }: ColumnFn) =>
    () =>
      [
        {
          Header: "Name",
          accessor: "name",
        },
        {
          Header: "Email",
          accessor: "email",
        },
        {
          Header: "Criado Em",
          accessor: "createdAt",
          Filter: DateColumnFilter,
          filter: "dateBetween",
          Cell: ({ value = new Date() }) => (
            <span>{new Date(value).toLocaleDateString()}</span>
          ),
        },
        {
          Header: "",
          accessor: "id",
          Filter: NoFilter,
          Cell: ({ value = "" }) => {
            const currentPost = getPost(value);

            return (
              <div className="text-end d-flex justify-content-end">
                <EditButton
                  className="me-2"
                  onClick={() => {
                    setPasswordIsValid(true);
                    setConfirmPasswordIsValid(true);
                    onUpdate(value);
                  }}
                />
                {currentPost && (
                  <StatusButton
                    active={currentPost["active"]}
                    onClick={() => onStatusChange(value, currentPost["active"])}
                  />
                )}
              </div>
            );
          },
        },
      ];

  const initialUsersData = {
    roleId: 2,
    status: "approved",
    active: true,
  };

  return (
    <LayoutDefault>
      <PostType
        initialPostData={initialUsersData}
        dataConfig={{
          url,
          token,
          insertUrlFn: (url = "", id = "") => `${register_url}/${id}`,
          fetcherDataFn: (response: AxiosResponse) =>
            response.data.users.filter(isAdmin),
          // v2 (specs/016): /admin/users* via lib/users.ts; o legado segue com as rotas antigas.
          ...(isUserV2()
            ? {
                fetcherFn: () => v2Fetcher(),
                insertFn: v2Insert,
                updateFn: v2Update,
                removeFn: v2Remove,
              }
            : {}),
        }}
        formConfig={{
          insertTitle: "Adicionar Administrador",
          editTitle: "Editar Administrador",
          fields,
        }}
        tableConfig={{
          columnsFn: colunas,
        }}
        pageConfig={{
          pageTitle: "Administradores",
        }}
      />
    </LayoutDefault>
  );
};

export default Page;
