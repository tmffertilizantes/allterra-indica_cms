import { apiUrl } from "../lib/api";
import { AlertError } from "@components/Alerts/Alerts";
import LayoutDefault from "@components/Layouts/default";
import { PostType } from "@components/postType";
import ModalExibirPost from "@components/postType/ModalExibirPost";
import { NoFilter } from "@components/Table";
import EditButton from "@components/Utils/Buttons/EditButton";
import RemoveButton from "@components/Utils/Buttons/RemoveButton";
import ShowButton from "@components/Utils/Buttons/ShowButton";
import StatusButton from "@components/Utils/Buttons/StatusButton";
import SelectCity from "@components/Utils/SelectCity";
import SelectState from "@components/Utils/SelectState";
import SelectTechnology from "@components/Utils/SelectTechnology";
import { useGlobal } from "@context/global";
import { getUserLocation } from "@context/user";
import axios, { AxiosResponse } from "axios";
import { ColumnFn } from "models/ColumnFn";
import React, { useState } from "react";
import { Spinner } from "react-bootstrap";
import Select from "react-select";
import useSWR from "swr";

interface CustomComponent {
  post: any;
  setPost: Function;
}

export default function Produtores() {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/producer`);

  const [showModalExibir, setShowModalExibir] = useState(false);
  const [loadingModalExibir, setLoadingModalExibir] = useState(false);

  const [currentPost, setCurrentPost] = useState<any>({});

  const [estado, setEstado] = useState<string | null>(null);
  const [technology, setTechnology] = useState<string | null>(null);

  const fields = [
    {
      field: "name",
      label: "Nome",
    },
    {
      field: "cpf",
      label: "CPF",
    },
    {
      field: "telephone",
      label: "Telefone",
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <SelectState
            value={post.stateId}
            onChange={(newValue: any) => {
              setEstado(newValue.value);
              setPost({ ...post, stateId: newValue.value });
            }}
          />
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <SelectCity
            value={post.cityId}
            state={post.stateId ? post.stateId : estado}
            onChange={(newValue: any) =>
              setPost({ ...post, cityId: newValue.value })
            }
          />
        </div>
      ),
    },
    {
      field: "area",
      label: "Área",
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <SelectTechnology
          className="mb-4"
          value={post.technology ? post.technology : technology}
          onChange={(event) => {
            setTechnology(event.target.value);
            setPost({ ...post, technology: event.target.value });
          }}
        />
      ),
    },
  ];

  const axios_options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const colunas =
    ({ onUpdate, onRemove, getPost, onStatusChange }: ColumnFn) =>
    () =>
      [
        {
          Header: "Name",
          accessor: "name",
        },
        {
          Header: "Telefone",
          accessor: "telephone",
        },
        {
          Header: "CPF",
          accessor: "cpf",
        },
        {
          Header: "Tecnologia",
          accessor: "technology",
        },
        {
          Header: "",
          accessor: "id",
          Filter: NoFilter,
          Cell: ({ value = "" }) => {
            const currentPost = getPost(value);

            return (
              <div className="text-end">
                <ShowButton
                  className="me-2"
                  onClick={async () => {
                    setShowModalExibir(true);
                    setLoadingModalExibir(true);

                    try {
                      let new_current_post = await getPost(value);

                      // pega a cidade e o estado do consultor
                      if (new_current_post.stateId) {
                        const location = await getUserLocation(
                          new_current_post.stateId,
                          new_current_post.cityId
                        );

                        new_current_post = {
                          ...new_current_post,
                          producer_location: location,
                        };
                      }

                      //pega o nome da cultura
                      if (new_current_post.cultureId) {
                        const producer_culture_raw = await axios.get(
                          apiUrl(`/culture/id/${new_current_post.cultureId}`),
                          axios_options
                        );
                        const producer_culture =
                          producer_culture_raw.data.culture.name;

                        new_current_post = {
                          ...new_current_post,
                          producer_culture: producer_culture,
                        };
                      }

                      setCurrentPost(new_current_post);
                    } catch (error) {
                      setShowModalExibir(false);
                      AlertError();
                    }

                    setLoadingModalExibir(false);
                  }}
                />

                <EditButton className="me-2" onClick={() => onUpdate(value)} />

                {currentPost && (
                  <StatusButton
                    active={currentPost["active"]}
                    onClick={() => onStatusChange(value, currentPost["active"])}
                  />
                )}
              </div>
            )
          },
        },
      ];

  function onCloseModalExibir() {
    setShowModalExibir(false);
  }

  function openModalExibir() {
    setShowModalExibir(true);
  }

  return (
    <LayoutDefault>
      <PostType
        removeAddButton
        dataConfig={{
          url,
          token,
          fetcherFn: (fetcherDataFn = () => {}, url = "", options = {}) =>
            axios
              .get(
                apiUrl(`/producer?includes=analysis,user`),
                options
              )
              .then(fetcherDataFn),
          fetcherDataFn: (response: AxiosResponse) => response.data.producers,
        }}
        formConfig={{
          insertTitle: "Adicionar Produtor",
          editTitle: "Editar Produtor",
          fields,
        }}
        tableConfig={{
          columnsFn: colunas,
        }}
        pageConfig={{
          pageTitle: "Produtores",
        }}
      />

      <ModalExibirPost
        title="Dados do produtor"
        show={showModalExibir}
        onClose={onCloseModalExibir}
      >
        <div>
          {loadingModalExibir ? (
            <div>
              <Spinner animation="border" variant="primary" />

              <hr />
            </div>
          ) : (
            <div>
              <div className="mb-2">
                <strong className="d-block">Nome:</strong> {currentPost.name}
              </div>
              <div className="mb-2">
                <strong className="d-block">CPF:</strong> {currentPost.cpf}
              </div>
              <div className="mb-2">
                <strong className="d-block">Telefone:</strong>{" "}
                {currentPost.telephone}
              </div>
              <div className="mb-2">
                <strong className="d-block">Cidade:</strong>{" "}
                {currentPost.producer_location
                  ? currentPost.producer_location.city
                  : "-"}
              </div>
              <div className="mb-2">
                <strong className="d-block">Estado:</strong>{" "}
                {currentPost.producer_location
                  ? currentPost.producer_location.state
                  : "-"}
              </div>
              <div className="mb-2">
                <strong className="d-block">Cultura:</strong>{" "}
                {currentPost.producer_culture}
              </div>
              <div className="mb-2">
                <strong className="d-block">Área:</strong> {currentPost.area}
              </div>
              <div className="mb-2">
                <strong className="d-block">Uso de tecnologia no Campo:</strong>{" "}
                {currentPost.technology}
              </div>

              <hr />
            </div>
          )}
        </div>
      </ModalExibirPost>
    </LayoutDefault>
  );
}
