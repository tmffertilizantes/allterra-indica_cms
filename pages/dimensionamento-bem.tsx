import { DateColumnFilter, NoFilter, PostType } from "@components";
import { NextPage } from "next";
import { useGlobal } from "@context/global";
import axios, { AxiosResponse } from "axios";
import LayoutDefault from "@components/Layouts/default";
import { useState } from "react";
import ModalExibirPost from "@components/postType/ModalExibirPost";
import { Spinner, Table } from "react-bootstrap";
import { ColumnFn } from "models/ColumnFn";
import ShowButton from "@components/Utils/Buttons/ShowButton";
import { AlertError } from "@components/Alerts/Alerts";

const MODE_LABELS: Record<string, string> = {
  daily: "Uso Diário",
  weekly: "Uso Semanal",
};

const formatBRL = (value?: number | null) =>
  (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatKg = (value?: number | null) =>
  value == null
    ? "-"
    : `${value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} kg`;

const formatLitros = (value?: number | null) =>
  value == null ? "-" : `${Math.round(value).toLocaleString("pt-BR")} L`;

const Page: NextPage = () => {
  const { token = "" } = useGlobal();
  const url = `${process.env.API_URL}/bemSizing`;

  const [showModalExibir, setShowModalExibir] = useState(false);
  const [currentPost, setCurrentPost] = useState<any>({});
  const [loadingModalContent, setLoadingModalContent] =
    useState<boolean>(false);

  function onCloseModalExibir() {
    setShowModalExibir(false);
  }

  const axiosOptions = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const colunas =
    ({ getPost }: ColumnFn) =>
    () =>
      [
        {
          Header: "Produtor",
          accessor: "producer.name",
          Cell: ({ value }: any) => <span>{value || "-"}</span>,
        },
        {
          Header: "Consultor",
          accessor: "consultant.user.name",
          Cell: ({ value }: any) => <span>{value || "-"}</span>,
        },
        {
          Header: "Modo de uso",
          accessor: "mode",
          Filter: NoFilter,
          Cell: ({ value = "" }: any) => (
            <span className="p-2 rounded bg-light">
              {MODE_LABELS[value] || value}
            </span>
          ),
        },
        {
          Header: "Modelo recomendado",
          accessor: "id",
          id: "recommendedModel",
          Filter: NoFilter,
          Cell: ({ row }: any) => {
            const result = row.original.result || {};
            return (
              <span>
                {result.semModelo
                  ? "Sem modelo disponível"
                  : result.model?.name || formatLitros(result.model?.capacidadeLitros)}
              </span>
            );
          },
        },
        {
          Header: "Orçamento total",
          accessor: "id",
          id: "budgetTotal",
          Filter: NoFilter,
          Cell: ({ row }: any) => (
            <span>
              {row.original.result?.orcamento
                ? formatBRL(row.original.result.orcamento.total)
                : "-"}
            </span>
          ),
        },
        {
          Header: "Data",
          accessor: "createdAt",
          Filter: DateColumnFilter,
          filter: "dateBetween",
          Cell: ({ value = new Date() }: any) => (
            <span>{new Date(value).toLocaleDateString()}</span>
          ),
        },
        {
          Header: "",
          accessor: "id",
          id: "actions",
          Filter: NoFilter,
          Cell: ({ value = "" }: any) => (
            <div className="text-end">
              <ShowButton
                onClick={() => {
                  setLoadingModalContent(true);
                  setShowModalExibir(true);

                  try {
                    const post = getPost(value);
                    setCurrentPost(post || {});
                  } catch (error) {
                    setShowModalExibir(false);
                    AlertError();
                  }

                  setLoadingModalContent(false);
                }}
              />
            </div>
          ),
        },
      ];

  return (
    <LayoutDefault>
      <PostType
        removeAddButton
        dataConfig={{
          url,
          token,
          fetcherFn: (fetcherDataFn = () => {}, url = "", options = {}) =>
            axios.get(url, options).then(fetcherDataFn),
          fetcherDataFn: async (response: AxiosResponse) => {
            const bemSizings = response.data.bemSizings || [];

            const [producersRes, consultantsRes] = await Promise.all([
              axios.get(`${process.env.API_URL}/producer`, axiosOptions),
              axios.get(`${process.env.API_URL}/consultant`, axiosOptions),
            ]);
            const producers = producersRes.data.producers || [];
            const consultants = consultantsRes.data.consultants || [];

            const enriched = bemSizings.map((item: any) => ({
              ...item,
              producer: producers.find((p: any) => p.id === item.producerId),
              consultant: consultants.find(
                (c: any) => c.id === item.consultantId
              ),
            }));

            return enriched.sort(
              (a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          },
        }}
        tableConfig={{
          columnsFn: colunas,
        }}
        pageConfig={{
          pageTitle: "Dimensionamento de Bio Estação (BEM)",
        }}
      />

      <ModalExibirPost
        title="Dimensionamento de Bio Estação (BEM)"
        show={showModalExibir}
        onClose={onCloseModalExibir}
        size="lg"
      >
        {loadingModalContent ? (
          <div>
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <div>
            <Table className="mb-3" bordered size="sm">
              <tbody>
                <tr>
                  <td className="w-50">Produtor</td>
                  <td>{currentPost?.producer?.name || "-"}</td>
                </tr>
                <tr>
                  <td>Consultor</td>
                  <td>{currentPost?.consultant?.user?.name || "-"}</td>
                </tr>
                <tr>
                  <td>Modo de uso</td>
                  <td>{MODE_LABELS[currentPost?.mode] || currentPost?.mode || "-"}</td>
                </tr>
                <tr>
                  <td>Data</td>
                  <td>
                    {currentPost?.createdAt
                      ? new Date(currentPost.createdAt).toLocaleString("pt-BR")
                      : "-"}
                  </td>
                </tr>
              </tbody>
            </Table>

            <h5>Parâmetros de uso</h5>
            <Table className="mb-3" bordered size="sm">
              <tbody>
                <tr>
                  <td className="w-50">Área Microgeo total (ha)</td>
                  <td>{currentPost?.inputs?.areaMicrogeoTotalHa ?? "-"}</td>
                </tr>
                <tr>
                  <td>Dose da cultura (L/ha)</td>
                  <td>{currentPost?.inputs?.doseCulturaLha ?? "-"}</td>
                </tr>
                <tr>
                  <td>Dose de parcelamento (L/ha)</td>
                  <td>{currentPost?.inputs?.doseParcelamentoLha ?? "-"}</td>
                </tr>
                {currentPost?.mode === "weekly" ? (
                  <tr>
                    <td>Aplicações por semana</td>
                    <td>{currentPost?.inputs?.aplicacoesPorSemana ?? "-"}</td>
                  </tr>
                ) : (
                  <tr>
                    <td>Área Microgeo por dia (ha)</td>
                    <td>{currentPost?.inputs?.areaMicrogeoPorDiaHa ?? "-"}</td>
                  </tr>
                )}
                <tr>
                  <td>Desconto aplicado</td>
                  <td>
                    {currentPost?.inputs?.aplicarDesconto
                      ? currentPost.inputs.tipoDesconto === "percentual"
                        ? `${currentPost.inputs.valorDesconto}%`
                        : formatBRL(currentPost.inputs.valorDesconto)
                      : "Não"}
                  </td>
                </tr>
              </tbody>
            </Table>

            <h5>Resultado</h5>
            {currentPost?.result?.semModelo ? (
              <div className="alert alert-warning">
                Sem modelo disponível — consultar equipe técnica.
              </div>
            ) : (
              <>
                <Table className="mb-3" bordered size="sm">
                  <tbody>
                    <tr>
                      <td className="w-50">Modelo recomendado</td>
                      <td>
                        {currentPost?.result?.model?.name ||
                          formatLitros(currentPost?.result?.model?.capacidadeLitros)}
                      </td>
                    </tr>
                    <tr>
                      <td>Capacidade</td>
                      <td>{formatLitros(currentPost?.result?.model?.capacidadeLitros)}</td>
                    </tr>
                    <tr>
                      <td>Volume estimado</td>
                      <td>{formatLitros(currentPost?.result?.volumeEstimado)}</td>
                    </tr>
                  </tbody>
                </Table>

                {currentPost?.result?.orcamento && (
                  <Table className="mb-3" bordered size="sm">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="text-end">Quant.</th>
                        <th className="text-end">Custo/kg</th>
                        <th className="text-end">Custo total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Microgeo Start</td>
                        <td className="text-end">
                          {formatKg(currentPost.result.qtdStartKg)}
                        </td>
                        <td className="text-end">
                          {formatBRL(currentPost.result.custoUnitStartPorKg)}
                        </td>
                        <td className="text-end">
                          {formatBRL(currentPost.result.orcamento.custoTotalStart)}
                        </td>
                      </tr>
                      <tr>
                        <td>Microgeo Reposição</td>
                        <td className="text-end">
                          {formatKg(currentPost.result.qtdReposicaoKg)}
                        </td>
                        <td className="text-end">
                          {formatBRL(currentPost.result.custoUnitReposicaoPorKg)}
                        </td>
                        <td className="text-end">
                          {formatBRL(currentPost.result.orcamento.custoTotalReposicao)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="text-end">
                          Subtotal
                        </td>
                        <td className="text-end">
                          {formatBRL(currentPost.result.orcamento.subtotal)}
                        </td>
                      </tr>
                      {currentPost.result.orcamento.valorDescontoAplicado > 0 && (
                        <tr>
                          <td colSpan={3} className="text-end">
                            Desconto
                          </td>
                          <td className="text-end">
                            - {formatBRL(currentPost.result.orcamento.valorDescontoAplicado)}
                          </td>
                        </tr>
                      )}
                      <tr className="table-primary">
                        <td colSpan={3} className="text-end">
                          <strong>Total</strong>
                        </td>
                        <td className="text-end">
                          <strong>{formatBRL(currentPost.result.orcamento.total)}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                )}
              </>
            )}

            <h5>PDF</h5>
            {currentPost?.pdf ? (
              <iframe
                srcDoc={currentPost.pdf}
                style={{
                  width: "100%",
                  height: "60vh",
                  border: "none",
                }}
                sandbox="allow-same-origin allow-scripts allow-popups"
                title="Dimensionamento BEM PDF"
              />
            ) : (
              <div className="alert alert-secondary">
                O consultor ainda não gerou o PDF deste dimensionamento no aplicativo.
              </div>
            )}
          </div>
        )}
      </ModalExibirPost>
    </LayoutDefault>
  );
};

export default Page;
