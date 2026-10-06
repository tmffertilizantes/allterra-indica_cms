import { apiUrl } from "../lib/api";
import LayoutDefault from "@components/Layouts/default";
import { useGlobal } from "@context/global";
import { useEffect, useState } from "react";
import axios from "axios";
import { Tabs, Tab, Spinner, Form } from "react-bootstrap";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ResultSectionOrder {
  id: number;
  analysisType:
    | "nutrition"
    | "fertility"
    | "tmfVsCompetitor"
    | "productionCost"
    | "bemSizing";
  sectionOrder: string[];
  hiddenSections: string[];
  createdAt: string;
  updatedAt: string;
}

const ANALYSIS_TYPE_LABELS: Record<ResultSectionOrder["analysisType"], string> = {
  nutrition: "Manutenção e Nutrição de Plantas",
  fertility: "Fertilidade e Construção de Perfil de Solo",
  tmfVsCompetitor: "Investimento TMF x Concorrente",
  productionCost: "Custo de Produção",
  bemSizing: "Dimensionamento de Bio Estação (BEM)",
};

const SECTION_LABELS: Record<string, string> = {
  guarantees: "Garantias do produto",
  summary: "Resumo",
  recommendation: "Recomendação",
  nutrientsDelivered: "Nutrientes entregues",
  nutritionalRequirement: "Exigências nutricionais",
  productDescription: "Descrição do produto",
  comparisonHighlight: "Comparação em destaque",
  competitorCostDetail: "Detalhamento do custo concorrente",
  tmfInvestmentDetail: "Detalhamento do investimento TMF",
  comparisonDetail: "Detalhamento da comparação de produtividade/custo",
  recommendedModel: "Modelo de Bio Estação recomendado",
  recommendedInputs: "Insumos recomendados",
  indicators: "Indicadores",
  budget: "Orçamento Final",
};

const DEFAULT_ORDER_BY_TYPE: Record<ResultSectionOrder["analysisType"], string[]> = {
  nutrition: [
    "guarantees",
    "summary",
    "nutrientsDelivered",
    "nutritionalRequirement",
    "productDescription",
  ],
  fertility: [
    "guarantees",
    "summary",
    "recommendation",
    "nutrientsDelivered",
    "nutritionalRequirement",
    "productDescription",
  ],
  tmfVsCompetitor: ["comparisonHighlight", "competitorCostDetail", "tmfInvestmentDetail"],
  productionCost: ["comparisonHighlight", "comparisonDetail"],
  bemSizing: ["recommendedModel", "recommendedInputs", "indicators", "summary", "budget"],
};

function SortableSectionItem({
  sectionKey,
  isHidden,
  onToggleHidden,
}: {
  sectionKey: string;
  isHidden: boolean;
  onToggleHidden: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionKey,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`list-group-item d-flex justify-content-between align-items-center ${
        isHidden ? "text-muted bg-light" : ""
      }`}
    >
      <div className="d-flex align-items-center gap-3">
        <span
          {...attributes}
          {...listeners}
          className="fe fe-move"
          style={{ cursor: "grab", fontSize: "1.1rem" }}
          title="Arrastar para reordenar"
        />
        <span>{SECTION_LABELS[sectionKey] || sectionKey}</span>
      </div>

      <Form.Check
        type="switch"
        id={`toggle-${sectionKey}`}
        label={isHidden ? "Oculta" : "Exibida"}
        checked={!isHidden}
        onChange={() => onToggleHidden(sectionKey)}
      />
    </div>
  );
}

export default function PersonalizacaoResultados() {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/resultSectionOrder`);

  const [rows, setRows] = useState<ResultSectionOrder[]>([]);
  const [activeType, setActiveType] = useState<ResultSectionOrder["analysisType"]>("nutrition");
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const axiosOptions = { headers: { Authorization: `Bearer ${token}` } };

  async function fetchRows() {
    setLoading(true);
    const response = await axios.get(url, axiosOptions);
    setRows(response.data.resultSectionOrders || []);
    setLoading(false);
  }

  useEffect(() => {
    if (token) fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const activeRow = rows.find((row) => row.analysisType === activeType);

  function updateActiveRow(patch: Partial<ResultSectionOrder>) {
    if (!activeRow) return;
    setRows((prev) =>
      prev.map((row) => (row.id === activeRow.id ? { ...row, ...patch } : row))
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!activeRow || !over || active.id === over.id) return;

    const oldIndex = activeRow.sectionOrder.indexOf(String(active.id));
    const newIndex = activeRow.sectionOrder.indexOf(String(over.id));
    updateActiveRow({ sectionOrder: arrayMove(activeRow.sectionOrder, oldIndex, newIndex) });
  }

  function toggleHidden(sectionKey: string) {
    if (!activeRow) return;
    const hiddenSections = activeRow.hiddenSections.includes(sectionKey)
      ? activeRow.hiddenSections.filter((key) => key !== sectionKey)
      : [...activeRow.hiddenSections, sectionKey];
    updateActiveRow({ hiddenSections });
  }

  async function saveOrder(sectionOrder: string[], hiddenSections: string[]) {
    if (!activeRow) return;
    setSaving(true);
    const response = await axios.patch(
      `${url}/${activeRow.id}`,
      { sectionOrder, hiddenSections },
      axiosOptions
    );
    const updated = response.data.resultSectionOrder;
    setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    setSaving(false);
  }

  function restoreDefault() {
    if (!activeRow) return;
    saveOrder(DEFAULT_ORDER_BY_TYPE[activeRow.analysisType], []);
  }

  return (
    <LayoutDefault>
      <div className="container-fluid p-4">
        <div className="row">
          <div className="col-lg-12 col-md-12 col-12">
            <div className="border-bottom pb-4 mb-4 d-md-flex align-items-center justify-content-between">
              <div>
                <h1 className="mb-0">Personalização de Resultados</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-12 col-md-12 col-12">
            {isLoading ? (
              <Spinner animation="border" variant="primary" />
            ) : (
              <Tabs
                activeKey={activeType}
                onSelect={(key) => key && setActiveType(key as ResultSectionOrder["analysisType"])}
                className="mb-3"
              >
                {(Object.keys(ANALYSIS_TYPE_LABELS) as ResultSectionOrder["analysisType"][]).map(
                  (type) => {
                    const row = rows.find((r) => r.analysisType === type);

                    return (
                      <Tab eventKey={type} title={ANALYSIS_TYPE_LABELS[type]} key={type}>
                        {row && (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={row.sectionOrder}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="list-group mt-3">
                                {row.sectionOrder.map((sectionKey) => (
                                  <SortableSectionItem
                                    key={sectionKey}
                                    sectionKey={sectionKey}
                                    isHidden={row.hiddenSections.includes(sectionKey)}
                                    onToggleHidden={toggleHidden}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}

                        <div className="mt-3 d-flex gap-2">
                          <button
                            className="btn btn-primary"
                            disabled={isSaving || !row}
                            onClick={() => row && saveOrder(row.sectionOrder, row.hiddenSections)}
                          >
                            {isSaving ? "Salvando..." : "Salvar"}
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            disabled={isSaving || !row}
                            onClick={restoreDefault}
                          >
                            Restaurar padrão
                          </button>
                        </div>
                      </Tab>
                    );
                  }
                )}
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </LayoutDefault>
  );
}
