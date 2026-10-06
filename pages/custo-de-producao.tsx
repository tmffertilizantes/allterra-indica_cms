import { apiUrl } from "../lib/api";
import { DateColumnFilter, NoFilter, PostType } from "@components";
import { NextPage } from "next";
import { useGlobal } from "@context/global";
import axios, { AxiosResponse } from "axios";
import LayoutDefault from "@components/Layouts/default";
import { useState } from "react";
import ModalExibirPost from "@components/postType/ModalExibirPost";
import { Spinner } from "react-bootstrap";
import { ColumnFn } from "models/ColumnFn";
import ShowButton from "@components/Utils/Buttons/ShowButton";
import { AlertError } from "@components/Alerts/Alerts";
import { getUserLocation } from "@context/user";
import StatusButton from "@components/Utils/Buttons/StatusButton";

const Page: NextPage = () => {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/core`);

  const [csvData, setCsvData] = useState(null);

  const [showModalExibir, setShowModalExibir] = useState(false);
  const [currentPost, setCurrentPost] = useState<any>({});
  const [loadingModalContent, setLoadingModalContent] =
    useState<boolean>(false);

  function onCloseModalExibir() {
    setShowModalExibir(false);
  }

  function openModalExibir() {
    setShowModalExibir(true);
  }

  const colunas =
    ({ onUpdate, onRemove, getPost, onStatusChange }: ColumnFn) =>
      () =>
        [
          {
            Header: "Consultor",
            accessor: "user.name",
          },
          {
            Header: "Data",
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
                  <ShowButton
                    className="me-2"
                    onClick={async () => {
                      setLoadingModalContent(true);
                      setShowModalExibir(true);

                      try {
                        let new_current_post = await getPost(value);

                        // pega a cidade e o estado do consultor
                        if (new_current_post.user.stateId) {
                          const consultant_location = await getUserLocation(
                            new_current_post.user.stateId,
                            new_current_post.user.cityId
                          );

                          new_current_post = {
                            ...new_current_post,
                            consultant_location: consultant_location,
                          };
                        }

                        setCurrentPost(new_current_post);
                      } catch (error) {
                        setShowModalExibir(false);
                        AlertError();
                      }

                      setLoadingModalContent(false);
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

  const axios_options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  return (
    <LayoutDefault>
      <PostType
        removeAddButton
        csvData={csvData}
        dataConfig={{
          url,
          token,
          fetcherFn: (fetcherDataFn = () => {}, url = "", options = {}) =>
            axios
              .get(apiUrl(`/core`), options)
              .then(fetcherDataFn),
          fetcherDataFn: async (response: AxiosResponse) => {
            const cores_raw = response.data.cores.data;

            const users_raw = await axios.get(
              apiUrl(`/user`),
              axios_options
            );
            const users = users_raw.data.users;

            const cores = cores_raw
              .map((core: any) => {
                if (core.pdfLink[0]) {
                  core = {
                    ...core,
                    pdf_url: core.pdfLink[0].pdfPathName,
                  };
                } else {
                  core = {
                    ...core,
                    pdf_url: false,
                  };
                }

                return {
                  ...core,
                  costProductionRequest: JSON.parse(core.costProductionRequest),
                  costProductionResult: JSON.parse(core.costProductionResult),
                  user: users.find((user: any) => user.id === core.userId),
                };
              })
              .filter((core: any) => core.costProductionRequest !== null);

            const cores_sort = cores.sort(
              // @ts-ignore
              (a: any, b: any) => new Date(b.createdAt) - new Date(a.createdAt)
            );

            var data_for_csv = cores_sort.map((core: any) => {
              return {
                id: core.id,
                consultant_name: core.user.name,
                consultant_email: core.user.email,

                saca: core.costProductionRequest.bagPrice,
                area_total: core.costProductionRequest.totalArea,

                tmf_dose: core.costProductionRequest.fertilizingDosage,
                tmf_price_per_ton: core.costProductionRequest.fertilizingPrice,
                tmf_cost_per_ha: core.costProductionResult.costTotal,
                tmf_productivity: core.costProductionRequest.productivity,

                concorrente_dose:
                  core.costProductionRequest.competingFertilizingDosage,
                concorrente_price_per_ton:
                  core.costProductionRequest.competingFertilizingPrice,
                concorrente_cost_per_ha:
                  core.costProductionResult.competingCostTotal,
                concorrente_productivity:
                  core.costProductionRequest.competingProductivity,

                diferenca_custo: core.costProductionResult.costDiference,
                diferenca_produtividade:
                  core.costProductionResult.differenceProductivity,

                lucro_por_ha: core.costProductionResult.profitPerArea,
                lucro_por_area: core.costProductionResult.profitTotalArea,
              };
            });

            setCsvData(data_for_csv);

            return cores_sort;
          },
        }}
        formConfig={{
          insertTitle: "Adicionar Custo de Produção",
          editTitle: "Editar Custo de Produção",
        }}
        tableConfig={{
          columnsFn: colunas,
        }}
        pageConfig={{
          pageTitle: "Custo de Produção",
        }}
      />

      <ModalExibirPost
        title="Custo de Produção"
        show={showModalExibir}
        onClose={onCloseModalExibir}
        size="lg"
      >
        <div>
          {loadingModalContent ? (
            <div>
              <Spinner animation={"border"} variant="primary" />
            </div>
          ) : (
            <iframe
              srcDoc={currentPost.pdf}
              style={{
                width: "100%",
                height: "80vh",
                border: "none",
              }}
              sandbox="allow-same-origin allow-scripts allow-popups"
              title="Análise PDF"
            />
            // currentPost.user && (
            //   <div>
            //     <Row>
            //       <Col>
            //         <section>
            //           <h4>Dados do consultor</h4>
            //           <div>Nome: {currentPost.user.name}</div>
            //           <div>Email: {currentPost.user.email}</div>
            //           <div>CPF: {currentPost.user.identification}</div>
            //           <div>Telefone: {currentPost.user.phone}</div>
            //           <div>
            //             Cidade:{" "}
            //             {currentPost.consultant_location
            //               ? currentPost.consultant_location.city
            //               : ""}
            //           </div>
            //           <div>
            //             Estado:{" "}
            //             {currentPost.consultant_location
            //               ? currentPost.consultant_location.state
            //               : ""}
            //           </div>
            //           <div>Revenda: {currentPost.user.formResale}</div>
            //           <div>Região: {currentPost.user.formRegion}</div>
            //         </section>
            //       </Col>
            //     </Row>

            //     <hr />
            //     <h4>Custo de produção TMF x Concorrente</h4>

            //     <Table className="mt-2" bordered>
            //       <tbody>
            //         <tr>
            //           <td className="w-50">
            //             <div className="d-flex justify-content-between">
            //               Preço da Saca (R$):{" "}
            //               <span>
            //                 {currentPost.costProductionRequest.bagPrice ?? "-"}
            //               </span>
            //             </div>
            //           </td>
            //           <td className="w-50">
            //             <div className="d-flex justify-content-between">
            //               Área Total (ha):
            //               <span>
            //                 {currentPost.costProductionRequest.totalArea ?? "-"}
            //               </span>
            //             </div>
            //           </td>
            //         </tr>

            //         <tr>
            //           <td className="text-center">
            //             <b>TMF</b>
            //           </td>
            //           <td className="text-center">
            //             <b>Concorrente</b>
            //           </td>
            //         </tr>

            //         <tr>
            //           <td>
            //             Dose kg/ha:{" "}
            //             {currentPost.costProductionRequest.fertilizingDosage ??
            //               "-"}
            //           </td>
            //           <td>
            //             Dose kg/ha:{" "}
            //             {currentPost.costProductionRequest
            //               .competingFertilizingDosage ?? "-"}
            //           </td>
            //         </tr>

            //         <tr>
            //           <td>
            //             R$/Ton:{" "}
            //             {currentPost.costProductionRequest.fertilizingPrice ??
            //               "-"}
            //           </td>
            //           <td>
            //             R$/Ton:{" "}
            //             {currentPost.costProductionRequest
            //               .competingFertilizingPrice ?? "-"}
            //           </td>
            //         </tr>

            //         <tr>
            //           <td>
            //             Custo Total/ha: R${" "}
            //             {currentPost.costProductionResult.costTotal.toFixed(
            //               2
            //             ) ?? "-"}
            //           </td>
            //           <td>
            //             Custo Total/ha: R${" "}
            //             {currentPost.costProductionResult.competingCostTotal.toFixed(
            //               2
            //             ) ?? "-"}
            //           </td>
            //         </tr>

            //         <tr>
            //           <td className="text-end">Diferença de custo</td>
            //           <td>
            //             R${" "}
            //             {currentPost.costProductionResult.costDiference.toFixed(
            //               2
            //             ) ?? "-"}
            //           </td>
            //         </tr>

            //         <tr className="text-center">
            //           <td>Produtividade TMF (sacas/ha)</td>
            //           <td>Produtividade Concorrente (sacas/ha):</td>
            //         </tr>

            //         <tr className="text-center bg-light">
            //           <td>
            //             {currentPost.costProductionRequest.productivity ?? "-"}
            //           </td>
            //           <td>
            //             {currentPost.costProductionRequest
            //               .competingProductivity ?? "-"}
            //           </td>
            //         </tr>

            //         <tr>
            //           <td className="text-end">Diferença sc/há</td>
            //           <td>
            //             R${" "}
            //             {currentPost.costProductionResult.differenceProductivity.toFixed(
            //               2
            //             ) ?? "-"}
            //           </td>
            //         </tr>

            //         <tr className="text-center bg-primary text-light">
            //           <td colSpan={2}>
            //             <strong>
            //               <div className="d-flex justify-content-between">
            //                 Lucro por há (R$):{" "}
            //                 <span>
            //                   {currentPost.costProductionResult.profitTotalArea.toFixed(
            //                     2
            //                   ) ?? "-"}
            //                 </span>
            //               </div>
            //             </strong>
            //           </td>
            //         </tr>
            //         <tr className="text-center bg-primary text-light">
            //           <td colSpan={2}>
            //             <strong>
            //               <div className="d-flex justify-content-between">
            //                 Lucro por Área há (R$):{" "}
            //                 <span>
            //                   {currentPost.costProductionResult.profitPerArea.toFixed(
            //                     2
            //                   ) ?? "-"}
            //                 </span>
            //               </div>
            //             </strong>
            //           </td>
            //         </tr>
            //       </tbody>
            //     </Table>

            //     <hr />
            //   </div>
            // )
          )}
        </div>
      </ModalExibirPost>
    </LayoutDefault>
  );
};

export default Page;
