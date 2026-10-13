import { api, apiUrl } from "../lib/api";
import { isFeatureEnabled } from "../lib/clientConfig";
import { DateColumnFilter, NoFilter, PostType } from "@components";
import { NextPage } from "next";
import { useGlobal } from "@context/global";
import LayoutDefault from "@components/Layouts/default";
import { useEffect, useState } from "react";
import ModalExibirPost from "@components/postType/ModalExibirPost";
import { Spinner, Table } from "react-bootstrap";
import { ColumnFn } from "models/ColumnFn";
import ShowButton from "@components/Utils/Buttons/ShowButton";
import { AlertError } from "@components/Alerts/Alerts";

/**
 * Histórico da Posição Microgeo (specs/017-posicao-microgeo, US3) — mesmo padrão de
 * `dimensionamento-bem.tsx` e da Fertilidade: PostType (busca, filtros, ordenação e paginação no
 * cliente) + modal de detalhe com o PDF gravado pelo app. Módulo nativo da v2: só aparece com
 * `microgeoPosition` ligado no /client-config.
 */

const PAGE_SIZE = 100;
/** Teto de segurança da carga da listagem (100 páginas de 100). */
const MAX_PAGES = 100;

const CUSTOMER_LABELS: Record<string, string> = {
  PROSPECT: "Prospecção",
  CUSTOMER: "Cliente usuário",
};
const GROUP_LABELS: Record<string, string> = {
  ANUAL: "Anual — 150 L/ha",
  PERENE: "Perene — 300 L/ha",
};

type Position = {
  id: number;
  generatedAt: string;
  producerName: string;
  consultantName: string;
  cultureName: string;
  customerType: string;
  productName: string;
  pdfExported: boolean;
  pdf?: string | null;
  snapshot: any;
  // campos derivados para a tabela
  cultureLabel?: string;
  customerTypeLabel?: string;
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "-";

/** Lê todas as páginas da v2 (take ≤ 100) e devolve os itens, mais recentes primeiro. */
async function fetchAllPositions(): Promise<Position[]> {
  const items: Position[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await api.get(`/microgeo-position?take=${PAGE_SIZE}&skip=${page * PAGE_SIZE}`);
    const pageItems: Position[] = res.data?.items ?? [];
    items.push(...pageItems);
    if (!pageItems.length || items.length >= (res.data?.total ?? 0)) break;
  }
  return items.map((item) => ({
    ...item,
    cultureLabel: item.snapshot?.culture?.displayName || item.cultureName,
    customerTypeLabel: CUSTOMER_LABELS[item.customerType] || item.customerType,
  }));
}

const Page: NextPage = () => {
  const { token = "" } = useGlobal();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [showModalExibir, setShowModalExibir] = useState(false);
  const [currentPost, setCurrentPost] = useState<Position | null>(null);
  const [loadingModalContent, setLoadingModalContent] = useState(false);

  // A configuração remota é lida no cliente (export estático).
  useEffect(() => setEnabled(isFeatureEnabled("microgeoPosition")), []);

  async function openDetail(id: number) {
    setShowModalExibir(true);
    setLoadingModalContent(true);
    try {
      const res = await api.get(`/microgeo-position/${id}`);
      setCurrentPost(res.data?.microgeoPosition ?? null);
    } catch {
      setShowModalExibir(false);
      AlertError();
    } finally {
      setLoadingModalContent(false);
    }
  }

  const colunas =
    (_: ColumnFn) =>
    () =>
      [
        {
          Header: "Data",
          accessor: "generatedAt",
          Filter: DateColumnFilter,
          filter: "dateBetween",
          Cell: ({ value }: any) => <span>{formatDate(value)}</span>,
        },
        {
          Header: "Produtor",
          accessor: "producerName",
          Cell: ({ value }: any) => <span>{value || "-"}</span>,
        },
        {
          Header: "Consultor",
          accessor: "consultantName",
          Cell: ({ value }: any) => <span>{value || "-"}</span>,
        },
        {
          Header: "Cultura",
          accessor: "cultureLabel",
          Cell: ({ value }: any) => <span>{value || "-"}</span>,
        },
        {
          Header: "Tipo de cliente",
          accessor: "customerTypeLabel",
          Cell: ({ value = "" }: any) => <span className="p-2 rounded bg-light">{value}</span>,
        },
        {
          Header: "",
          accessor: "id",
          id: "actions",
          Filter: NoFilter,
          Cell: ({ value }: any) => (
            <div className="text-end">
              <ShowButton onClick={() => openDetail(value)} />
            </div>
          ),
        },
      ];

  if (enabled === false) {
    return (
      <LayoutDefault>
        <div className="container-fluid p-4">
          <h1 className="mb-4">Posição Microgeo</h1>
          <div className="alert alert-secondary">Funcionalidade indisponível.</div>
        </div>
      </LayoutDefault>
    );
  }

  const snapshot = currentPost?.snapshot;

  return (
    <LayoutDefault>
      {enabled && (
        <PostType
          removeAddButton
          dataConfig={{
            url: apiUrl(`/microgeo-position?take=${PAGE_SIZE}&skip=0`),
            token,
            fetcherFn: () => fetchAllPositions(),
          }}
          csvHeaders={[
            { label: "Data", key: "generatedAt" },
            { label: "Produtor", key: "producerName" },
            { label: "Consultor", key: "consultantName" },
            { label: "Cultura", key: "cultureLabel" },
            { label: "Tipo de cliente", key: "customerTypeLabel" },
            { label: "Produto", key: "productName" },
          ]}
          tableConfig={{ columnsFn: colunas }}
          pageConfig={{ pageTitle: "Posição Microgeo" }}
        />
      )}
      <ModalExibirPost
        title="Posição Microgeo"
        show={showModalExibir}
        onClose={() => setShowModalExibir(false)}
        size="lg"
      >
        {loadingModalContent || !currentPost ? (
          <div>
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <div>
            <h5>Resumo</h5>
            <Table className="mb-3" bordered size="sm">
              <tbody>
                <tr>
                  <td className="w-50">Produtor</td>
                  <td>{currentPost.producerName || "-"}</td>
                </tr>
                <tr>
                  <td>Consultor</td>
                  <td>{currentPost.consultantName || "-"}</td>
                </tr>
                <tr>
                  <td>Tipo de cliente</td>
                  <td>{CUSTOMER_LABELS[currentPost.customerType] || "-"}</td>
                </tr>
                <tr>
                  <td>Produto</td>
                  <td>{currentPost.productName || "-"}</td>
                </tr>
                <tr>
                  <td>Cultura</td>
                  <td>{snapshot?.culture?.displayName || currentPost.cultureName || "-"}</td>
                </tr>
                <tr>
                  <td>Grupo</td>
                  <td>{GROUP_LABELS[snapshot?.group?.code] || "-"}</td>
                </tr>
                <tr>
                  <td>Data</td>
                  <td>
                    {currentPost.generatedAt
                      ? new Date(currentPost.generatedAt).toLocaleString("pt-BR")
                      : "-"}
                  </td>
                </tr>
              </tbody>
            </Table>
            <h5>Dose recomendada</h5>
            <Table className="mb-3" bordered size="sm">
              <tbody>
                <tr>
                  <td className="w-50">Dose de solo</td>
                  <td>{snapshot?.dose ? `${snapshot.dose.soilDoseLHa} L/ha` : "-"}</td>
                </tr>
                {snapshot?.dose?.foliarDoseLHa != null && (
                  <tr>
                    <td>Dose foliar</td>
                    <td>
                      {snapshot.dose.foliarDoseLHa} L/ha × até{" "}
                      {snapshot.dose.foliarMaxApplications} aplicações
                    </td>
                  </tr>
                )}
                <tr>
                  <td>Dose/Época</td>
                  <td>{snapshot?.dose?.description || "-"}</td>
                </tr>
              </tbody>
            </Table>

            <h5>PDF</h5>
            {currentPost.pdf ? (
              <iframe
                srcDoc={currentPost.pdf}
                style={{ width: "100%", height: "60vh", border: "none" }}
                sandbox=""
                title="Posição Microgeo PDF"
              />
            ) : (
              <div className="alert alert-secondary">
                O consultor ainda não gerou o PDF desta Posição Microgeo no aplicativo.
              </div>
            )}
          </div>
        )}
      </ModalExibirPost>
    </LayoutDefault>
  );
};

export default Page;
