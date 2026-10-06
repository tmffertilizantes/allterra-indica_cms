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

  const fetcherRoles = (url = "", token = "") =>
    axios
      .get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => res.data.roles);

  const { data: roles } = useSWR(
    [apiUrl(`/role`), token],
    fetcherRoles
  );

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
            response.data.users.filter(
              (user: { roleId: number }) =>
                user.roleId === 2 || user.roleId === 1
            ),
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
