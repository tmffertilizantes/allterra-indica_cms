import { apiUrl } from "../../lib/api";
import {
  useMemo,
  useState,
  useCallback, useEffect,
  useRef
} from "react";
import useSWR, { useSWRConfig } from "swr";
import axios from "axios";

import { Table, NoFilter, DateColumnFilter } from "@components";
import { Modal, Spinner } from "react-bootstrap";
import EditButton from "@components/Utils/Buttons/EditButton";
import {
  AlertItemCreated,
  AlertItemEdited,
  AlertItemRemoved,
  AlertError,
  AlertUserRemoved,
} from "@components/Alerts/Alerts";
import SelectLanguage from "@components/Utils/SelectLanguage";
import StatusButton from "@components/Utils/Buttons/StatusButton";
import { CSVLink } from "react-csv";
import Select from "react-select";

interface DefaultColumnsFn {
  onUpdate: Function;
  onRemove: Function;
  onStatusChange: Function;
  onTrash: Function;
  getPost: Function;
  reloadData: Function;
}

interface DefaultFieldForm {
  label: string;
  field: string;
  type: string;
  setPost: Function;
  isValid?: boolean;
  errorMessage: string;
  post: any;
  disableEdit?: boolean;
}

interface ModalTrashPost {
  show: boolean;
  post: any;
  onClose: () => void;
  onConfirm: () => void;
}

interface ModalAddPost {
  show: boolean;
  post: any;
  fields: Array<any>;
  setPost: Function;
  insertTitle: string;
  editTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}

interface CategoryFilter {
  value: string;
  label: string;
}

const defaultUrlFn = (url = "", id = "") => `${url}/${id}`;

const defaultFetcherFn = (fetcherDataFn = () => {}, url = "", options = {}) =>
  axios.get(url, options).then(fetcherDataFn);

const defaultInsertFn = async (
  insertUrl = "",
  url = "",
  options = {},
  post = {},
  fetcherDataFn = (result: any) => {}
) => {
  try {
    await axios.post(insertUrl, post, options);
    const result = await axios.get(url, options);

    if (result.status === 200) {
      AlertItemCreated();
    } else {
      AlertError();
    }

    return fetcherDataFn(result);
  } catch (error) {
    AlertError();
  }
};

const defaultUpdateFn = async (
  updateUrl = "",
  url = "",
  options = {},
  post = {},
  fetcherDataFn = (result: any) => {}
) => {
  await axios.patch(updateUrl, post, options);
  const result = await axios.get(url, options);

  if (result.status === 200) {
    AlertItemEdited();
  } else {
    AlertError();
  }

  return fetcherDataFn(result);
};

const defaultRemoveFn = async (
  removeUrl = "",
  url = "",
  options = {},
  fetcherDataFn = (result: any) => {}
) => {
  await axios.delete(removeUrl, options);
  const result = await axios.get(url, options);

  if (result.status === 200) {
    AlertItemRemoved();
  } else {
    AlertError();
  }

  return fetcherDataFn(result);
};

const defaultColumnsFn =
  ({
    onUpdate,
    onTrash,
    onRemove,
    getPost,
    onStatusChange,
  }: DefaultColumnsFn) =>
    () =>
      [
        {
          Header: "Nome",
          accessor: "name",
          sortType: "basic",
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

            if (!currentPost) {
              return;
            }

            if (!currentPost.hasOwnProperty("active")) {
              currentPost["active"] = false;
            }

            if (currentPost["active"] == null) {
              currentPost["active"] = false;
            }

            return (
              <div className="text-end">
                <EditButton className="me-2" onClick={() => onUpdate(value)} />

                <StatusButton
                  active={currentPost["active"]}
                  onClick={() => onStatusChange(value, currentPost["active"])}
                />

                {/* <RemoveButton onClick={() => onRemove(value)} /> */}
              </div>
            );
          },
        },
      ];

const defaultFieldForm = ({
  label,
  field,
  type,
  setPost,
  post,
  disableEdit,
  isValid,
  errorMessage,
  ...props
}: DefaultFieldForm) => {
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={field}>
        {label}
      </label>
      <input
        value={post[field]}
        autoComplete="off"
        onChange={(e) =>
          setPost((post: any) => ({ ...post, [field]: e.target.value }))
        }
        type={type}
        id={field}
        disabled={disableEdit && post.id}
        className="form-control"
        {...props}
      />
      {isValid === false && <div className="text-danger">{errorMessage}</div>}
    </div>
  );
};

const PostType = ({
  queryParams = null,
  initialPostData = null,
  removeAddButton = false,
  exportConsultantRegistrationButton = false,
  exportButton = true,
  csvData = null,
  csvHeaders = null,
  dataConfig: {
    url = "",
    token = "",
    fetcherFn = defaultFetcherFn,
    fetcherDataFn = (res: { data: any }) => res.data,
    insertFn = defaultInsertFn,
    insertUrlFn = defaultUrlFn,
    updateFn = defaultUpdateFn,
    updateUrlFn = defaultUrlFn,
    removeFn = defaultRemoveFn,
    removeUrlFn = defaultUrlFn,
  } = {},
  tableConfig: {
    columnsFn = defaultColumnsFn,
    asConsultantRegister = false,
  } = {},
  formConfig: { fields = [], insertTitle = "", editTitle = "" } = {},
  pageConfig: { pageTitle = "" } = {},
  categoryFilter: { categories = [] } = {},
  clickDateButton,
  onCloseModal
}: any) => {
  const isDefaultPostDataStarted = useRef(false);

  const [showModal, setShowModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [post, setPost] = useState<any>({});
  const [language, setLanguage] = useState<string>("pt-BR");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter | null>(
    null
  );

  useEffect(() => {
    reloadData();
  }, [queryParams]);

  useEffect(() => {
    if (initialPostData && !isDefaultPostDataStarted.current) {
      setPost(initialPostData);

      isDefaultPostDataStarted.current = true;
    }
  }, [initialPostData]);

  const { mutate } = useSWRConfig();

  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const { data: posts, error } = useSWR([url, options], (...data) =>
    fetcherFn(fetcherDataFn, ...data)
  );

  const closeTrashModal = () => {
    setShowTrashModal(false);
    setPost({});
  };

  const closeModal = () => {
    setShowModal(false);
    setPost({});
    onCloseModal && onCloseModal();
  };

  const getPost = useCallback(
    (id: any) => {
      return posts.find((post: { id: any }) => post.id === id);
    },
    [posts]
  );

  const onUpdate = useCallback(
    (id: any) => {
      setPost(posts.find((post: { id: any }) => post.id === id));
      setShowModal(true);
    },
    [posts]
  );

  const onTrash = useCallback(
    (id: any) => {
      setPost(posts.find((post: { id: any }) => post.id === id));
      setShowTrashModal(true);
    },
    [posts]
  );

  const onStatusChange = useCallback(
    (id: any, active: boolean) => {
      const config = { rollbackOnError: true };
      setPost(posts.find((post: { id: any }) => post.id === id));

      let new_obj = {};

      new_obj = {
        id: id,
        active: !active,
      };

      mutate(
        [url, options],
        updateFn(updateUrlFn(url, id), url, options, new_obj, fetcherDataFn),
        config
      );
    },
    [posts, options, mutate]
  );

  const onRemove = useCallback(
    (id: any) => {
      const data = {
        optimisticData: posts.filter((post: { id: any }) => post.id !== id),
        rollbackOnError: true,
      };

      mutate(
        [url, options],
        removeFn(removeUrlFn(url, id), url, options, fetcherDataFn),
        data
      );
      closeModal();
    },
    [posts, options, mutate]
  );

  const reloadData = () => {
    mutate([url, options]);
  };

  const sendUserToTrash = async () => {
    const options = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const result = await axios.delete(
      apiUrl(`/consultant/soft/${post.id}`),
      options
    );

    if (result.status === 200) {
      AlertUserRemoved();
      reloadData();
      closeTrashModal();
    } else {
      AlertError();
    }
  };

  const saveModalData = () => {
    const config = { rollbackOnError: true, optimisticData: [{}] };

    if (post.id) {
      config.optimisticData = posts.map((item: { id: any }) =>
        item.id === post.id ? post : item
      );
      mutate(
        [url, options],
        updateFn(updateUrlFn(url, post.id), url, options, post, fetcherDataFn),
        config
      );
    } else {
      if (posts) {
        config.optimisticData = [...posts, post];
      } else {
        config.optimisticData = [post];
      }
      mutate(
        [url, options],
        insertFn(insertUrlFn(url), url, options, { ...post, lang: post?.lang || 'pt-BR' }, fetcherDataFn),
        config
      );
    }

    closeModal();
  };

  const columns: any = useMemo(
    columnsFn({
      onUpdate,
      onTrash,
      onRemove,
      onStatusChange,
      getPost,
      reloadData,
    }),
    [
      onUpdate,
      onTrash,
      onRemove,
      getPost,
      onStatusChange,
      reloadData,
      columnsFn,
    ]
  );

  function hasMultipleLanguages() {
    if (initialPostData?.hasOwnProperty("lang") && !initialPostData?.hasOwnProperty('guarantees')) {
      return true;
    } else {
      return false;
    }
  }

  function getTableData() {
    let table_data = posts;

    if (hasMultipleLanguages()) {
      table_data = table_data.filter(
        (post: any) => post?.lang?.toLowerCase() == language.toLowerCase()
      );
    }

    if (categoryFilter) {
      table_data = table_data.filter(
        (post: any) => post.categoryId == categoryFilter.value
      );
    }

    return table_data;
  }

  return (
    <>
      <div className="container-fluid p-4">
        <div className="row">
          <div className="col-lg-12 col-md-12 col-12">
            <div className="border-bottom pb-4 mb-4 d-md-flex align-items-center justify-content-between">
              <div>
                <h1 className="mb-0">{pageTitle}</h1>
              </div>

              <div className="d-flex gap-2">
                {posts && exportConsultantRegistrationButton && (
                  <button
                    className="btn btn-outline-primary"
                    onClick={clickDateButton}
                  >
                    Definir período
                  </button>
                )}
                {posts && exportButton && (
                  <CSVLink
                    className="btn btn-outline-primary"
                    data={csvData ?? posts}
                    headers={csvHeaders ?? false}
                    enclosingCharacter={""}
                  >
                    Exportar
                  </CSVLink>
                )}
                {!removeAddButton && (
                  <div>
                    <a
                      href="#"
                      onClick={() => {
                        setShowModal(true);
                      }}
                      className="btn btn-primary"
                      data-bs-toggle="modal"
                      data-bs-target="#newRegion"
                    >
                      {insertTitle}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-12 col-md-12 col-12">
            {hasMultipleLanguages() && (
              <SelectLanguage
                className="mb-6"
                label={`Filtrar pelo idioma:`}
                type="radio"
                value={language}
                onChangeAsRadio={(event) => {
                  setLanguage(event.target.id);
                }}
              />
            )}

            {categories.length > 0 && (
              <>
                <label htmlFor="" className="form-label">
                  Filtrar por categoria:
                </label>
                <Select
                  value={categoryFilter}
                  isClearable
                  placeholder="Selecione a categoria..."
                  classNamePrefix="select"
                  className="mb-4"
                  options={categories}
                  onChange={(newValue: any) => {
                    setCategoryFilter(newValue);
                  }}
                />
                <hr className="mb-5" />
              </>
            )}

            {posts?.length > 0 ? (
              <div className="mb-4">
                <div className="table-responsive border-0 overflow-y-hidden">
                  <Table
                    columns={columns}
                    data={getTableData()}
                    asConsultantRegister={asConsultantRegister}
                  />
                </div>
              </div>
            ) : !posts && !error ? (
              <div>
                <Spinner animation="border" variant="primary" />
              </div>
            ) : (
              <div>Nenhum item encontrado</div>
            )}
          </div>
        </div>
      </div>

      <ModalAddPost
        show={showModal}
        post={post}
        fields={fields}
        setPost={setPost}
        insertTitle={insertTitle}
        editTitle={editTitle}
        onClose={closeModal}
        onConfirm={saveModalData}
      />

      <ModalTrashUser
        show={showTrashModal}
        post={post}
        onClose={closeTrashModal}
        onConfirm={sendUserToTrash}
      />
    </>
  );
};

const ModalTrashUser = ({ onConfirm, onClose, show, post }: ModalTrashPost) => {
  return (
    <Modal
      show={show}
      onHide={onClose}
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      animation={false}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Tem certeza que deseja excluir <br /> <b>{post?.user?.name}</b>?
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="text-center">
        <div className="d-flex gap-3 mt-4 justify-content-center">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={onConfirm}
          >
            Sim
          </button>

          <button className="btn btn-outline-danger btn-sm" onClick={onClose}>
            Não
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

const ModalAddPost = ({
  show,
  fields,
  post,
  setPost,
  insertTitle = "",
  editTitle = "",
  onConfirm,
  onClose,
}: ModalAddPost) => {
  const title = post.id ? editTitle : insertTitle;
  const haveInvalidField = fields.find((field) => field.isValid === false);

  return (
    <Modal show={show} onHide={onClose} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {fields.map(
          (
            {
              label,
              field,
              isValid,
              errorMessage,
              customEvents = () => ({}),
              Component = defaultFieldForm,
              ...props
            },
            index
          ) => (
            <Component
              key={index}
              label={label}
              field={field}
              isValid={isValid}
              errorMessage={errorMessage}
              {...customEvents(setPost)}
              {...props}
              post={post}
              setPost={setPost}
            />
          )
        )}

        {title && (
          <button
            disabled={haveInvalidField}
            className="btn btn-primary me-2"
            onClick={onConfirm}
          >
            {title}
          </button>
        )}
        <button className="btn btn-outline-white" onClick={onClose}>
          Fechar
        </button>
      </Modal.Body>
    </Modal>
  );
};

export { PostType };
