import { apiUrl } from "../lib/api";
import {
  AlertError,
  AlertItemEdited,
  AlertUserRemoved,
} from "@components/Alerts/Alerts";
import LayoutDefault from "@components/Layouts/default";
import { PostType } from "@components/postType";
import {
  DateColumnFilter,
  NoFilter,
  SelectColumnFilter,
} from "@components/Table";
import EditButton from "@components/Utils/Buttons/EditButton";
import RemoveButton from "@components/Utils/Buttons/RemoveButton";
import StatusButton from "@components/Utils/Buttons/StatusButton";
import SelectCity from "@components/Utils/SelectCity";
import SelectState from "@components/Utils/SelectState";
import { useGlobal } from "@context/global";
import axios, { AxiosResponse } from "axios";
import { ColumnFn } from "models/ColumnFn";
import React, { useState } from "react";
import { Form } from "react-bootstrap";
import Select from "react-select";
import useSWR from "swr";
import TrashButton from "@components/Utils/Buttons/TrashButton";
import Swal from "sweetalert2";
import {
  fetchAllUsers,
  isUserV2,
  resetUserPassword,
  serverMessage,
  setActive,
  setApproval,
  updateUser,
} from "../lib/users";

/** Status de aprovação carregado na lista: approve/disapprove só quando ele mudar (v2). */
const loadedStatus: Record<number, string | null | undefined> = {};

interface CustomComponent {
  post: any;
  setPost: Function;
}

const fetcherUsers = (url = "", token = "") =>
  axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data.users);

const fetcherRegions = (url = "", token = "") =>
  axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data.regions);

const fetcherResales = (url = "", token = "") =>
  axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data.resales);

interface User {
  activatedAt?: string;
  active?: boolean;
  cityId?: number;
  createdAt?: string;
  email?: string;
  id?: number;
  identification?: string;
  name?: string;
  phone?: string;
  roleId?: number;
  stateId: number;
  status?: string;
  updatedAt?: string;
}

interface Consultor {
  id?: number;
  resale?: string;
  resaleId?: number;
  regionId?: number;
  betaTester?: boolean;
  user: User;
  userId?: number;
}

export default function Consultores() {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/consultant`);

  const [estado, setEstado] = useState<number | null>(null);
  const [csvData, setCsvData] = useState(null);

  const fields = [
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          {/*
            Redefinição pelo administrador: com `user` na v2, POST /admin/users/:id/reset-password
            gera uma senha temporária e a envia ao consultor (nunca aparece aqui — specs/016,
            FR-032). No legado a rota segue bloqueada na borda desde o dia 1 (spec 013).
          */}
          <div className="text-end">
            <button
              type="button"
              className="btn btn-outline-white btn-sm"
              disabled={!isUserV2() || !post?.user?.id}
              onClick={async () => {
                const answer = await Swal.fire({
                  icon: "warning",
                  title: "Gerar nova senha?",
                  text: "Uma senha temporária será enviada ao consultor por e-mail e WhatsApp, e as sessões abertas dele serão encerradas.",
                  showCancelButton: true,
                  confirmButtonText: "Gerar e enviar",
                  cancelButtonText: "Cancelar",
                });
                if (!answer.isConfirmed) return;
                try {
                  await resetUserPassword(post.user.id);
                  Swal.fire({ icon: "success", title: "Nova senha enviada ao consultor" });
                } catch (error) {
                  Swal.fire({ icon: "error", title: "Erro", text: serverMessage(error, "Não foi possível gerar a senha") });
                }
              }}>
              Gerar nova senha
            </button>
            {!isUserV2() && (
              <div className="form-text">
                Indisponível temporariamente. Peça ao consultor para usar &quot;Esqueci minha
                senha&quot; no app.
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label">Aprovar Consultor</label>

          {post.hasOwnProperty("user") && (
            <Form.Check
              type="switch"
              id="custom-switch"
              checked={post.user.status === "approved"}
              onChange={(event) => {
                var user_status = "";

                if (event.target.checked) {
                  user_status = "approved";
                } else {
                  user_status = "";
                }

                setPost({
                  ...post,
                  user: {
                    ...post.user,
                    status: user_status,
                  },
                });
              }}
            />
          )}
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label">Beta Tester</label>

          <Form.Check
            type="switch"
            id="beta-tester-switch"
            checked={!!post.betaTester}
            onChange={(event) =>
              setPost({
                ...post,
                betaTester: event.target.checked,
              })
            }
          />
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label" htmlFor="name">
            Nome
          </label>

          {post.hasOwnProperty("user") && (
            <input
              value={post?.user.name}
              onChange={(e) =>
                setPost({
                  ...post,
                  user: {
                    ...post.user,
                    name: e.target.value,
                  },
                })
              }
              type="text"
              id="name"
              className="form-control"
            />
          )}
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label" htmlFor="email">
            E-mail
          </label>

          {post.hasOwnProperty("user") && (
            <input
              value={post.user.email}
              onChange={(e) =>
                setPost({
                  ...post,
                  user: {
                    ...post.user,
                    email: e.target.value,
                  },
                })
              }
              type="email"
              id="email"
              className="form-control"
            />
          )}
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label" htmlFor="phone">
            Telefone
          </label>

          {post.hasOwnProperty("user") && (
            <input
              value={post.user.phone}
              onChange={(e) =>
                setPost({
                  ...post,
                  user: {
                    ...post.user,
                    phone: e.target.value,
                  },
                })
              }
              type="text"
              id="phone"
              className="form-control"
            />
          )}
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label" htmlFor="identification">
            CPF
          </label>

          {post.hasOwnProperty("user") && (
            <input
              value={post.user.identification}
              onChange={(e) =>
                setPost({
                  ...post,
                  user: {
                    ...post.user,
                    identification: e.target.value,
                  },
                })
              }
              type="text"
              id="identification"
              className="form-control"
            />
          )}
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          {post.hasOwnProperty("user") && (
            <SelectState
              value={post.user.stateId}
              onChange={(newValue: any) => {
                setEstado(newValue.value);
                setPost({
                  ...post,
                  user: {
                    ...post.user,
                    stateId: newValue.value,
                  },
                });
              }}
            />
          )}
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          {post.hasOwnProperty("user") && (
            <SelectCity
              value={post.user.cityId}
              state={post.user.stateId ?? estado}
              onChange={(newValue: any) => {
                setPost({
                  ...post,
                  user: {
                    ...post.user,
                    cityId: newValue.value,
                  },
                });
              }}
            />
          )}
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div>
          <label className="form-label">Revenda</label>

          <Select
            value={resales_as_options.find(
              (resale: any) => resale.value === post.resaleId
            )}
            placeholder="Selecione a revenda..."
            classNamePrefix="select"
            className="mb-4"
            options={resales_as_options}
            onChange={(newValue: any) => {
              setPost({
                ...post,
                resaleId: newValue.value,
              });
            }}
          />
        </div>
      ),
    },
{
      Component: ({ post, setPost }: CustomComponent) => (
        <div>
          <label className="form-label">Região</label>

          <Select
            value={regions_as_options.find(
              (region: any) => region.value === post.regionId
            )}
            placeholder="Selecione a região..."
            classNamePrefix="select"
            className="mb-4"
            options={regions_as_options}
            onChange={(newValue: any) => {
              setPost({
                ...post,
                regionId: newValue.value,
              });
            }}
          />
        </div>
      ),
    },
  ];

  const updateFn = async (
    updateUrl = "",
    url = "",
    options = {},
    post: Consultor,
    fetcherDataFn = (result: any) => {}
  ) => {
    try {
      if (isUserV2()) return await updateFnV2(url, options, post, fetcherDataFn);
      const updateConsultantUser = axios.patch(
        apiUrl(`/user/${post.user.id}`),
        {
          name: post.user.name,
          identification: post.user.identification,
          email: post.user.email,
          phone: post.user.phone,
          stateId: post.user.stateId,
          cityId: post.user.cityId,
          status: post.user.status,
        },
        options
      );

      const updateConsultant = axios.patch(
        apiUrl(`/consultant/${post.id}`),
        {
          resaleId: post.resaleId,
          regionId: post.regionId,
          betaTester: post.betaTester,
        },
        options
      );

      const result = axios.get(url, options);

      let [resultUpdateConsultantUser, resultUpdateConsultant, resultGet] =
        await Promise.all([updateConsultantUser, updateConsultant, result]);

      if (
        resultGet.data.success &&
        resultUpdateConsultantUser.data.success &&
        resultUpdateConsultant.data.success
      ) {
        AlertItemEdited();
      } else {
        AlertError();
      }

      return fetcherDataFn(resultGet);
    } catch (error) {
      AlertError();
    }
  };

  /** v2 (specs/016): dados pessoais em /admin/users/:id, aprovação em endpoint próprio. */
  const updateFnV2 = async (
    url: string,
    options: object,
    post: Consultor,
    fetcherDataFn: (result: any) => any
  ) => {
    try {
      const userId = post.user.id as number;
      const approved = post.user.status === "approved";
      await Promise.all([
        updateUser(userId, post.user as any),
        axios.patch(
          apiUrl(`/consultant/${post.id}`),
          { resaleId: post.resaleId, regionId: post.regionId, betaTester: post.betaTester },
          options
        ),
      ]);
      if (approved !== (loadedStatus[userId] === "approved")) await setApproval(userId, approved);
      AlertItemEdited();
    } catch (error) {
      Swal.fire({ icon: "error", title: "Erro", text: serverMessage(error, "Não foi possível salvar") });
    }
    return fetcherDataFn(await axios.get(url, options));
  };

  const { data: users, error } = useSWR(
    isUserV2() ? ["users-all", token] : [apiUrl(`/user`), token],
    isUserV2() ? () => fetchAllUsers() : fetcherUsers
  );

  const users_as_options = users?.map((user: { id: any; name: any }) => ({
    value: user.id,
    label: user.name,
  }));

  const { data: regions } = useSWR(
    [apiUrl(`/region`), token],
    fetcherRegions
  );

  const regions_as_options = regions?.map(
    (user: { id: any; name: string }) => ({
      value: user.id,
      label: user.name,
    })
  );

  const { data: resale } = useSWR(
    [apiUrl(`/resale`), token],
    fetcherResales
  );

  const resales_as_options = resale?.map((user: { id: any; name: string }) => ({
    value: user.id,
    label: user.name,
  }));

  const colunas =
    ({
      onUpdate,
      onRemove,
      onTrash,
      getPost,
      onStatusChange,
      reloadData,
    }: ColumnFn) =>
    () =>
      [
        {
          Header: "Nome",
          accessor: "user.name",
        },
        {
          Header: "Telefone",
          accessor: "user.phone",
        },
        {
          Header: "CPF",
          accessor: "user.identification",
        },
        {
          Header: "Aprovado",
          accessor: "user_status",
          Filter: SelectColumnFilter,
          Cell: ({ value = "" }) => (
            <span>{value === "Aprovado" ? "✓" : "✖"}</span>
          ),
        },
        {
          Header: "Revenda",
          accessor: "resale.name",
        },
        {
          Header: "Criado Em",
          accessor: "user.createdAt",
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
              <div className="text-end d-flex">
                <EditButton
                  className="me-2"
                  onClick={() => {
                    onUpdate(value);
                  }}
                />

                {currentPost && currentPost.user && (
                  <StatusButton
                    active={currentPost.user?.["active"]}
                    onClick={async () => {
                      const options = {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      };

                      try {
                        await setActive(currentPost.user.id, !currentPost.user["active"]);
                      } catch (error) {
                        AlertError();
                        return;
                      }

                      const result = await axios.get(url, options);

                      if (result.status === 200) {
                        AlertItemEdited();
                        reloadData();
                      } else {
                        AlertError();
                      }
                    }}
                  />
                )}

                <TrashButton
                  onClick={async () => {
                    onTrash(value);
                  }}
                />
              </div>
            );
          },
        },
      ];

  return (
    <LayoutDefault>
      <PostType
        removeAddButton
        csvData={csvData}
        dataConfig={{
          url,
          token,
          fetcherFn: (
            fetcherDataFn = () => {},
            url = "/consultant?includes=region,resale",
            options = {}
          ) => axios.get(url, options).then(fetcherDataFn),
          fetcherDataFn: (response: AxiosResponse) => {
            const consultant = response.data.consultants;

            var consultant_list: any[] = [];

            var data_for_csv = consultant.map((consultant: any) => {
              if (consultant.user?.id) loadedStatus[consultant.user.id] = consultant.user.status;
              if (consultant.deletedAt === null) {
                consultant_list.push({
                  ...consultant,
                  user_status:
                    consultant.user.status == "approved"
                      ? "Aprovado"
                      : "Reprovado",
                });
              }

              return {
                id: consultant.id,
                active: consultant.active,
                name: consultant.user?.name ?? "",
                email: consultant.user?.email ?? "",
                identification: consultant.user?.identification ?? "",
                phone: consultant.user?.phone ?? "",
                status: consultant.user?.status ?? "",

                region: consultant.region?.name ?? "",
                resale: consultant.resale?.name ?? "",
              };
            });

            setCsvData(data_for_csv);

            console.log(consultant_list);

            return consultant_list;
          },
          updateUrlFn: (url = "", id = "") =>
            apiUrl(`/user/${id}`),
          updateFn: updateFn,
        }}
        tableConfig={{
          columnsFn: colunas,
        }}
        formConfig={{
          insertTitle: "Adicionar Consultor",
          editTitle: "Editar Consultor",
          fields,
        }}
        pageConfig={{
          pageTitle: "Consultores",
        }}
      />
    </LayoutDefault>
  );
}
