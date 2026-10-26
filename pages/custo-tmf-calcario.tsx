import { apiUrl } from "../lib/api";
import { fetchAllUsers } from "../lib/users";
import { DateColumnFilter, NoFilter, PostType } from '@components';
import { AlertError } from '@components/Alerts/Alerts';
import LayoutDefault from '@components/Layouts/default';
import ModalExibirPost from '@components/postType/ModalExibirPost';
import ShowButton from '@components/Utils/Buttons/ShowButton';
import StatusButton from '@components/Utils/Buttons/StatusButton';
import { useGlobal } from '@context/global';
import { getUserLocation } from '@context/user';
import axios, { type AxiosResponse } from 'axios';
import type { ColumnFn } from 'models/ColumnFn';
import type { NextPage } from 'next';
import { useState } from 'react';
import { Spinner, } from 'react-bootstrap';

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

  function _openModalExibir() {
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
                    } catch (_error) {
                      setShowModalExibir(false);
                      AlertError();
                    }

                    setLoadingModalContent(false);
                  }}
                />

                {currentPost && (
                  <StatusButton
                    active={currentPost.active}
                    onClick={() => onStatusChange(value, currentPost.active)}
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
          fetcherFn: (fetcherDataFn = () => {}, _url = "", options = {}) =>
            axios
              .get(apiUrl(`/core`), options)
              .then(fetcherDataFn),
          fetcherDataFn: async (response: AxiosResponse) => {
            const cores_raw = response.data.cores.data;

            // v1 `GET /user` ou v2 `/admin/users` paginado (specs/016).
            const users = await fetchAllUsers();

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
                  costCompetingRequest: JSON.parse(core.costCompetingRequest),
                  costCompetingResult: JSON.parse(core.costCompetingResult),
                  user: users.find((user: any) => user.id === core.userId),
                };
              })
              .filter((core: any) => core.costCompetingRequest !== null);

            const cores_sort = cores.sort(
              // @ts-expect-error
              (a: any, b: any) => new Date(b.createdAt) - new Date(a.createdAt)
            );

            var data_for_csv = cores_sort.map((core: any) => {
              return {
                id: core.id,
                consultant_name: core.user.name,
                consultant_email: core.user.email,

                tmf_recomendacao:
                  core.costCompetingRequest.limestoneRecomendation,

                tmf_insumo: core.costCompetingRequest.costInput.limestoneTon,
                tmf_frete: core.costCompetingRequest.costInput.shippingTon,
                tmf_custo_insumo: core.costCompetingResult.costInputTotal,

                tmf_homem_hora:
                  core.costCompetingRequest.costApplication.manHour,
                tmf_horas_trabalhadas:
                  core.costCompetingRequest.costApplication
                    .workedHoursTractorApplicator,

                tmf_trator_concha:
                  core.costCompetingRequest.costApplication.dieselTractorShell,
                tmf_horas_trabalhadas_concha:
                  core.costCompetingRequest.costApplication
                    .workedHoursTractorShell,

                tmf_trator_aplicador:
                  core.costCompetingRequest.costApplication
                    .dieselTractorApplicator,
                tmf_horas_trabalhadas_aplicador:
                  core.costCompetingRequest.costApplication
                    .workedHoursTractorApplicator,

                tmf_custo_aplicacao:
                  core.costCompetingResult.costApplicationTotal,
                tmf_custo_total: core.costCompetingResult.finalResultTMF,

                calcario_recomendacao:
                  core.costCompetingRequest.competingLimestoneRecomendation,

                calcario_insumo:
                  core.costCompetingRequest.competingCostInput.limestoneTon,
                calcario_frete:
                  core.costCompetingRequest.competingCostInput.shippingTon,
                calcario_perda_vento:
                  core.costCompetingRequest.competingCostInput
                    .windMoistureLossPercentage,
                calcario_prnt:
                  core.costCompetingRequest.competingCostInput
                    .limestoneEfficiencyPrntPercentage,
                calcario_insumo_custo:
                  core.costCompetingResult.competingCostInputTotal,

                calcario_homem_hora:
                  core.costCompetingRequest.competingCostApplication.manHour,
                calcario_horas_trabalhadas:
                  core.costCompetingRequest.competingCostApplication
                    .workedHoursTractorApplicator,

                calcario_trator_concha:
                  core.costCompetingRequest.competingCostApplication
                    .dieselTractorShell,
                calcario_horas_trabalhadas_concha:
                  core.costCompetingRequest.competingCostApplication
                    .workedHoursTractorShell,

                calcario_trator_aplicador:
                  core.costCompetingRequest.competingCostApplication
                    .dieselTractorApplicator,
                calcario_horas_trabalhadas_aplicador:
                  core.costCompetingRequest.competingCostApplication
                    .workedHoursTractorApplicator,

                calcario_aplicacao_custo:
                  core.costCompetingResult.competingCostApplicationTotal,

                calcario_incorporacao_homem_hora:
                  core.costCompetingRequest.competingCostIncorporation.manHour,
                calcario_incorporacao_horas:
                  core.costCompetingRequest.competingCostIncorporation
                    .hoursToApplication,
                calcario_incorporacao_trator:
                  core.costCompetingRequest.competingCostIncorporation
                    .dieselTractorGrid,
                calcario_incorporacao_trator_hora:
                  core.costCompetingRequest.competingCostIncorporation
                    .workedHoursTractorGrid,

                calcario_incorporacao_custo:
                  core.costCompetingResult.competingCostIncorporationTotal,

                calcario_custo_total:
                  core.costCompetingResult.finalResultCompeting,
              };
            });

            setCsvData(data_for_csv);

            return cores_sort;
          },
        }}
        formConfig={{
          insertTitle: "Adicionar Custo",
          editTitle: "Editar Custo",
        }}
        tableConfig={{
          columnsFn: colunas,
        }}
        pageConfig={{
          pageTitle: "Investimento TMF X Concorrente",
        }}
      />

      <ModalExibirPost
        title="Investimento TMF X Concorrente"
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
              title="Investimento TMF X Concorrente PDF"
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
            //           <div>Revenda: {currentPost.formResale}</div>
            //           <div>Região: {currentPost.formRegion}</div>
            //         </section>
            //       </Col>
            //     </Row>

            //     <hr />

            //     <Row>
            //       <Col>
            //         <Table size="sm" className="mt-2" bordered>
            //           <thead>
            //             <tr>
            //               <th className="text-center bg-primary text-white">
            //                 <h4 className="text-white my-0">
            //                   <b>Custo TMF</b>
            //                 </h4>
            //               </th>
            //             </tr>
            //           </thead>
            //           <tbody>
            //             <tr>
            //               <td>
            //                 Recomendação TMF (ton/ha):{" "}
            //                 <span>
            //                   {currentPost.costCompetingRequest
            //                     .limestoneRecomendation ?? "-"}
            //                 </span>
            //               </td>
            //             </tr>

            //             <tr className="text-center bg-light">
            //               <td>
            //                 Custos Gerais <b>INSUMO</b>
            //               </td>
            //             </tr>

            //             <tr>
            //               <td>
            //                 <div>
            //                   TMF (R$/ton):{" "}
            //                   <span>
            //                     {currentPost.costCompetingRequest.costInput
            //                       ?.limestoneTon ?? "-"}
            //                   </span>
            //                 </div>
            //                 <div>
            //                   Frete (R$/ton):{" "}
            //                   {currentPost.costCompetingRequest.costInput
            //                     ?.shippingTon ?? "-"}
            //                 </div>
            //               </td>
            //             </tr>

            //             <tr className="text-center">
            //               <td>
            //                 <strong>
            //                   <div className="d-flex justify-content-between">
            //                     Custo Insumo:{" "}
            //                     <span>
            //                       {currentPost.costCompetingResult.costInputTotal.toFixed(
            //                         2
            //                       ) ?? "-"}
            //                     </span>
            //                   </div>
            //                 </strong>
            //               </td>
            //             </tr>

            //             <tr className="text-center bg-light">
            //               <td>
            //                 Custos Gerais <b>APLICAÇÃO</b>
            //               </td>
            //             </tr>

            //             <tr>
            //               <td>
            //                 <div>
            //                   Homem Hora (R$/hrs):{" "}
            //                   {currentPost.costCompetingRequest.costApplication
            //                     ?.manHour ?? "-"}
            //                 </div>
            //                 <div>
            //                   Horas trabalhadas (hrs/ha):{" "}
            //                   {currentPost.costCompetingRequest.costApplication
            //                     ?.hoursToApplication ?? "-"}
            //                 </div>
            //               </td>
            //             </tr>

            //             <tr>
            //               <td>
            //                 <div>
            //                   Diesel Trator Concha (L/h):{" "}
            //                   {currentPost.costCompetingRequest.costApplication
            //                     ?.dieselTractorShell ?? "-"}
            //                 </div>
            //                 <div>
            //                   Horas trabalhadas (hrs/ha):{" "}
            //                   {currentPost.costCompetingRequest.costApplication
            //                     ?.workedHoursTractorShell ?? "-"}
            //                 </div>
            //               </td>
            //             </tr>

            //             <tr>
            //               <td>
            //                 <div>
            //                   Diesel Trator Aplicador (L/h):{" "}
            //                   {currentPost.costCompetingRequest.costApplication
            //                     ?.dieselTractorApplicator ?? "-"}
            //                 </div>
            //                 <div>
            //                   Horas trabalhadas (hrs/ha):{" "}
            //                   {currentPost.costCompetingRequest.costApplication
            //                     ?.workedHoursTractorApplicator ?? "-"}
            //                 </div>
            //               </td>
            //             </tr>

            //             <tr className="text-center">
            //               <td>
            //                 <strong>
            //                   <div className="d-flex justify-content-between">
            //                     Custo Aplicação:{" "}
            //                     <span>
            //                       {currentPost.costCompetingResult.costApplicationTotal.toFixed(
            //                         2
            //                       ) ?? "-"}
            //                     </span>
            //                   </div>
            //                 </strong>
            //               </td>
            //             </tr>

            //             <tr className="text-center bg-primary text-light">
            //               <td>
            //                 <strong>
            //                   <div className="d-flex justify-content-between">
            //                     Custo Total:{" "}
            //                     <span>
            //                       {currentPost.costCompetingResult.finalResultTMF.toFixed(
            //                         2
            //                       ) ?? "-"}
            //                     </span>
            //                   </div>
            //                 </strong>
            //               </td>
            //             </tr>
            //           </tbody>
            //         </Table>
            //       </Col>

            //       <Col>
            //         <Table size="sm" className="mt-2" bordered>
            //           <thead>
            //             <tr>
            //               <th className="text-center bg-primary text-white">
            //                 <h4 className="text-white my-0">
            //                   <b>Custo Calcário</b>
            //                 </h4>
            //               </th>
            //             </tr>
            //           </thead>
            //           <tbody>
            //             <tr>
            //               <td>
            //                 Recomendação Calcário (ton/ha):{" "}
            //                 <span>
            //                   {currentPost.costCompetingRequest
            //                     .competingLimestoneRecomendation ?? "-"}
            //                 </span>
            //               </td>
            //             </tr>

            //             <tr className="text-center bg-light">
            //               <td>
            //                 Custos Gerais <b>INSUMO</b>
            //               </td>
            //             </tr>

            //             <tr>
            //               <td>
            //                 <div>
            //                   Calcário (R$/ton):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostInput?.limestoneTon ?? "-"}
            //                 </div>
            //                 <div>
            //                   Frete (R$/ton):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostInput?.shippingTon ?? "-"}
            //                 </div>
            //                 <div>
            //                   Perdas com Umidade/Vento (%):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostInput
            //                     ?.windMoistureLossPercentage ?? "-"}
            //                 </div>
            //                 <div>
            //                   Eficiência PRNT Calcário (%):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostInput
            //                     ?.limestoneEfficiencyPrntPercentage ?? "-"}
            //                 </div>
            //               </td>
            //             </tr>

            //             <tr className="text-center">
            //               <td>
            //                 <strong>
            //                   <div className="d-flex justify-content-between">
            //                     Custo Insumo:{" "}
            //                     <span>
            //                       {currentPost.costCompetingResult.competingCostInputTotal.toFixed(
            //                         2
            //                       ) ?? "-"}
            //                     </span>
            //                   </div>
            //                 </strong>
            //               </td>
            //             </tr>

            //             <tr className="text-center bg-light">
            //               <td>
            //                 Custos Gerais <b>APLICAÇÃO</b>
            //               </td>
            //             </tr>

            //             <tr>
            //               <td>
            //                 <div>
            //                   Homem Hora (R$/hrs):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostApplication?.manHour ?? "-"}
            //                 </div>
            //                 <div>
            //                   Horas trabalhadas (hrs/ha):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostApplication?.hoursToApplication ??
            //                     "-"}
            //                 </div>
            //               </td>
            //             </tr>

            //             <tr>
            //               <td>
            //                 <div>
            //                   Diesel Trator Concha (L/h):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostApplication?.dieselTractorShell ??
            //                     "-"}
            //                 </div>
            //                 <div>
            //                   Horas trabalhadas (hrs/ha):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostApplication
            //                     ?.workedHoursTractorShell ?? "-"}
            //                 </div>
            //               </td>
            //             </tr>

            //             <tr>
            //               <td>
            //                 <div>
            //                   Diesel Trator Aplicador (L/h):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostApplication
            //                     ?.dieselTractorApplicator ?? "-"}
            //                 </div>
            //                 <div>
            //                   Horas trabalhadas (hrs/ha):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostApplication
            //                     ?.workedHoursTractorApplicator ?? "-"}
            //                 </div>
            //               </td>
            //             </tr>

            //             <tr className="text-center">
            //               <td>
            //                 <strong>
            //                   <div className="d-flex justify-content-between">
            //                     Custo Aplicação:{" "}
            //                     <span>
            //                       {currentPost.costCompetingResult.competingCostApplicationTotal.toFixed(
            //                         2
            //                       ) ?? "-"}
            //                     </span>
            //                   </div>
            //                 </strong>
            //               </td>
            //             </tr>

            //             <tr className="text-center bg-light">
            //               <td>
            //                 Custos Gerais <b>INCORPORAÇÃO</b>
            //               </td>
            //             </tr>

            //             <tr>
            //               <td>
            //                 <div>
            //                   Homem Hora (R$/hrs):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostIncorporation?.manHour ?? "-"}
            //                 </div>
            //                 <div>
            //                   Horas trabalhadas (hrs/ha):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostIncorporation
            //                     ?.hoursToApplication ?? "-"}
            //                 </div>
            //               </td>
            //             </tr>

            //             <tr>
            //               <td>
            //                 <div>
            //                   Diesel Trator Grade (L/h):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostIncorporation
            //                     ?.dieselTractorGrid ?? "-"}
            //                 </div>
            //                 <div>
            //                   Horas trabalhadas (hrs/ha):{" "}
            //                   {currentPost.costCompetingRequest
            //                     .competingCostIncorporation
            //                     ?.workedHoursTractorGrid ?? "-"}
            //                 </div>
            //               </td>
            //             </tr>

            //             <tr className="text-center">
            //               <td>
            //                 <strong>
            //                   <div className="d-flex justify-content-between">
            //                     Custo Aplicação:{" "}
            //                     <span>
            //                       {currentPost.costCompetingResult.competingCostIncorporationTotal.toFixed(
            //                         2
            //                       ) ?? "-"}
            //                     </span>
            //                   </div>
            //                 </strong>
            //               </td>
            //             </tr>

            //             <tr className="text-center bg-primary text-light">
            //               <td>
            //                 <strong>
            //                   <div className="d-flex justify-content-between">
            //                     Custo Total:{" "}
            //                     <span>
            //                       {currentPost.costCompetingResult.finalResultCompeting.toFixed(
            //                         2
            //                       ) ?? "-"}
            //                     </span>
            //                   </div>
            //                 </strong>
            //               </td>
            //             </tr>
            //           </tbody>
            //         </Table>
            //       </Col>
            //     </Row>

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
