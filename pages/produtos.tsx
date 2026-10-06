import { apiUrl } from "../lib/api";
import LayoutDefault from "@components/Layouts/default";
import { PostType } from "@components/postType";
import { DateColumnFilter, NoFilter } from "@components/Table";
import EditButton from "@components/Utils/Buttons/EditButton";
import RemoveButton from "@components/Utils/Buttons/RemoveButton";
import StatusButton from "@components/Utils/Buttons/StatusButton";
import SelectLanguage from "@components/Utils/SelectLanguage";
import { useGlobal } from "@context/global";
import axios, { AxiosResponse } from "axios";
import { ColumnFn } from "models/ColumnFn";
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import useSWR from "swr";

interface CustomComponent {
  post: any;
  setPost: Function;
}

const fetcherCategories = (url = "", token = "") =>
  axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data.categorys);

export default function Produtos() {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/product`);

  const [language, setLanguage] = useState("pt-br");
  const [productImage, setProductImage] = useState<{b64?: string, name?: string}>({})

  const [csvData, setCsvData] = useState(null);

  interface MineralName {
    name: "ca" | "si";
  }

  var minerals_obj = {
    ca: "",
    si: "",
    mg: "",
    b: "",
    s: "",
    n: "",
  };

  function changeMineral(
    value: any,
    name: "ca" | "si" | "mg" | "b" | "s" | "n",
    post: any,
    setPost: Function
  ) {
    if (post.minerals) {
      minerals_obj = post.minerals;
    }

    if (typeof minerals_obj !== "object") {
      minerals_obj = JSON.parse(minerals_obj);
    }

    minerals_obj[name] = value;

    setPost((post: any) => ({
      ...post,
      minerals: JSON.stringify(minerals_obj),
    }));
  }

  function getPostMineral(
    post: any,
    mineral_name: "ca" | "si" | "mg" | "b" | "s" | "n"
  ) {
    if (post.minerals) {
      if (typeof post.minerals !== "object") {
        try {
          var new_obj = JSON.parse(post.minerals);

          if (new_obj[mineral_name]) {
            return new_obj[mineral_name];
          }
        } catch (e) {
          return "";
        }
      } else {
        if (post.minerals[mineral_name]) {
          return post.minerals[mineral_name];
        }
      }
    }

    if (minerals_obj[mineral_name]) {
      return minerals_obj[mineral_name];
    }

    return "";
  }

  const fields = [
    {
      field: "name",
      label: "Nome",
      placeholder: "Exemplo",
      customEvents: (setCategoria: (arg0: (categoria: any) => any) => any) => ({
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          setCategoria((categoria) => ({
            ...categoria,
            name: e.target.value,
            slug: e.target.value
              .toLowerCase()
              .replace(/ /g, "_")
              .replace(/[^\w-]+/g, ""),
          })),
      }),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => {
        const [lang, setLang] = useState('pt');

        console.log(post)

        return (
        <div className="mb-3">
          <label className="form-label" htmlFor="guarantees">
            Visibilidade no aplicativo
          </label>

          <div className="d-flex gap-4 mb-2 ">
            <span className={`block cursor-pointer p-1 text-white rounded ${post.enabledOnNutrition ? 'bg-primary' : 'bg-danger'}`}
              onClick={() => setPost({...post, enabledOnNutrition: !post?.enabledOnNutrition })}
            >
              {post.enabledOnNutrition ? '✓ ' : 'ⓧ '}
              Manutenção e nutrição de plantas
            </span>
            {/* <span className={`block cursor-pointer p-1 text-white rounded ${post.enabledOnFertility ? 'bg-primary' : 'bg-danger'}`}
            onClick={() => setPost({...post, enabledOnFertility: !post?.enabledOnFertility })}
            >
              {post.enabledOnFertility ? '✓ ' : 'ⓧ '}
              Fertilidade e construção de perfil de solo
            </span> */}
          </div>

        </div>
      )
      },
    },
    // {
    //   Component: ({ post, setPost }: CustomComponent) => (
    //     <div>
    //       <SelectLanguage
    //         className="mb-4"
    //         value={post?.lang ? post?.lang : language}
    //         onChange={(event) => {
    //           setLanguage(event.target.value);
    //           setPost({ ...post, lang: event.target.value });
    //         }}
    //       />
    //     </div>
    //   ),
    // },
    {
      Component: ({ post, setPost }: CustomComponent) => {
        return (
        <div style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '5px'}}>
          <div className="mb-3">
            <label className="form-label" htmlFor="image">
              Imagem do produto
            </label>

            <div>
              <span>Para melhor exibição das imagens no aplicativo:</span>
              <ul>
                <li>Utilize formato PNG com fundo transparente</li>
                <li>Imagens leves</li>
                <li>Imagens bem recortadas, sem excesso de altura/largura</li>
              </ul>
            </div>

            {post?.image && (
                <div className="d-flex flex-column mb-3">
                  <span>Pré-visualização</span>
                  <img style={{ width: '100px', marginTop: '10px'}} src={post?.image} />
                </div>
            )}

            {productImage?.name ? (
              <div>
                <span>{productImage.name}</span>
                <button onClick={() => setProductImage({})} className="remove-file" style={{ borderRadius: '5px', marginLeft: '5px', background: '#', outline: 'none', border: 'none' }}>
                  alterar imagem
                </button>
              </div>
            ) : (
             <input
              onChange={(e) => handleFileB64(e, setPost)}
              type="file"
              accept="image/*"
              id="image"
              className="form-control"
            />
            )}

          </div>
        </div>
      )
      },
    },
    {
      Component: ({ post, setPost }: CustomComponent) => {
        const [lang, setLang] = useState('pt');

        return (
        <div className="mb-3">
          <label className="form-label" htmlFor="description">
            Descrição do produto
          </label>

          <div className="d-flex gap-4 mb-2 ">
            <span className={`block cursor-pointer p-1 ${lang==='pt' && 'bg-primary text-white'}`} onClick={() => setLang('pt')}>Português</span>
            <span className={`block cursor-pointer p-1 ${lang==='en' && 'bg-primary text-white'}`} onClick={() => setLang('en')}>Inglês</span>
            <span className={`block cursor-pointer p-1 ${lang==='es' && 'bg-primary text-white'}`} onClick={() => setLang('es')}>Espanhol</span>
          </div>

          {lang === 'pt' && (
          <textarea
            defaultValue={post?.description?.pt || ''}
            onChange={(e) => setPost({ ...post, description: {...post.description, pt: e.target.value } })}
            id="description"
            className="form-control"
            placeholder="[Português] Descrição do produto para exibição no aplicativo."
          />
          )}
           {lang === 'en' && (
          <textarea
            defaultValue={post?.description?.en || ''}
            onChange={(e) => setPost({ ...post, description: {...post.description, en: e.target.value } })}
            id="description"
            className="form-control"
            placeholder="[Inglês] Descrição do produto para exibição no aplicativo."
          />
          )}
           {lang === 'es' && (
          <textarea
            defaultValue={post?.description?.es || ''}
            onChange={(e) => setPost({ ...post, description: {...post.description, es: e.target.value } })}
            id="description"
            className="form-control"
            placeholder="[Espanhol] Descrição do produto para exibição no aplicativo."
          />
          )}
        </div>
      )
      },
    },
    {
      Component: ({ post, setPost }: CustomComponent) => {
        const [lang, setLang] = useState('pt');

        return (
        <div className="mb-3">
          <label className="form-label" htmlFor="guarantees">
            Garantias do produto
          </label>

          <div className="d-flex gap-4 mb-2 ">
            <span className={`block cursor-pointer p-1 ${lang==='pt' && 'bg-primary text-white'}`} onClick={() => setLang('pt')}>Português</span>
            <span className={`block cursor-pointer p-1 ${lang==='en' && 'bg-primary text-white'}`} onClick={() => setLang('en')}>Inglês</span>
            <span className={`block cursor-pointer p-1 ${lang==='es' && 'bg-primary text-white'}`} onClick={() => setLang('es')}>Espanhol</span>
          </div>

          {lang === 'pt' && (
          <textarea
            defaultValue={post?.guarantees?.pt || ''}
            onChange={(e) => setPost({ ...post, guarantees: {...post.guarantees, pt: e.target.value } })}
            id="guarantees"
            className="form-control"
            placeholder="[Português] Exemplo: Sacaria de 40kgs e Big Bag de 1T"
          />
          )}
           {lang === 'en' && (
          <textarea
            defaultValue={post?.guarantees?.en || ''}
            onChange={(e) => setPost({ ...post, guarantees: {...post.guarantees, en: e.target.value } })}
            id="guarantees"
            className="form-control"
            placeholder="[Inglês] Exemplo: Sacaria de 40kgs e Big Bag de 1T"
          />
          )}
           {lang === 'es' && (
          <textarea
            defaultValue={post?.guarantees?.es || ''}
            onChange={(e) => setPost({ ...post, guarantees: {...post.guarantees, es: e.target.value } })}
            id="guarantees"
            className="form-control"
            placeholder="[Espanhol] Exemplo: Sacaria de 40kgs e Big Bag de 1T"
          />
          )}
        </div>
      )
      },
    },
    // {
    //   Component: ({ post, setPost }: CustomComponent) => (
    //     <div>
    //       <label className="form-label">Categoria</label>

    //       <Select
    //         value={categories_as_options.find(
    //           (category: any) => category.value === post.categoryId
    //         )}
    //         placeholder="Selecione a categoria..."
    //         classNamePrefix="select"
    //         className="mb-4"
    //         options={categories_as_options}
    //         onChange={(newValue: any) => {
    //           setPost({
    //             ...post,
    //             categoryId: newValue.value,
    //           });
    //         }}
    //       />
    //     </div>
    //   ),
    // },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div className="mb-3">
          <label className="form-label" htmlFor="parameter">
            Parâmetro
          </label>

          <input
            defaultValue={post.parameter}
            onChange={function (e) {
              setPost({
                ...post,
                parameter: parseInt(e.target.value),
              });
            }}
            type="number"
            step="1"
            id="parameter"
            className="form-control"
            placeholder="230"
          />
        </div>
      ),
    },
    {
      Component: ({ post, setPost }: CustomComponent) => (
        <div>
          <div className="mb-3">
            <label className="form-label" htmlFor="minerals.ca">
              Cálcio
            </label>

            <input
              defaultValue={getPostMineral(post, "ca")}
              onChange={function (e) {
                changeMineral(e.target.value, "ca", post, setPost);
              }}
              type="number"
              step="0.01"
              id="minerals.ca"
              className="form-control"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="minerals.si">
              Silício
            </label>

            <input
              defaultValue={getPostMineral(post, "si")}
              onChange={function (e) {
                changeMineral(e.target.value, "si", post, setPost);
              }}
              type="number"
              step="0.01"
              id="minerals.si"
              className="form-control"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="minerals.mg">
              Magnésio
            </label>

            <input
              defaultValue={getPostMineral(post, "mg")}
              onChange={function (e) {
                changeMineral(e.target.value, "mg", post, setPost);
              }}
              type="number"
              step="0.01"
              id="minerals.mg"
              className="form-control"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="minerals.b">
              Boro
            </label>

            <input
              defaultValue={getPostMineral(post, "b")}
              onChange={function (e) {
                changeMineral(e.target.value, "b", post, setPost);
              }}
              type="number"
              step="0.01"
              id="minerals.b"
              className="form-control"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="minerals.s">
              Enxofre
            </label>

            <input
              defaultValue={getPostMineral(post, "s")}
              onChange={function (e) {
                changeMineral(e.target.value, "s", post, setPost);
              }}
              type="number"
              step="0.01"
              id="minerals.s"
              className="form-control"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="minerals.n">
              Nitrogênio
            </label>

            <input
              defaultValue={getPostMineral(post, "n")}
              onChange={function (e) {
                changeMineral(e.target.value, "n", post, setPost);
              }}
              type="number"
              step="0.01"
              id="minerals.n"
              className="form-control"
            />
          </div>
        </div>
      ),
    },
  ];

const handleFileB64 = (event: React.ChangeEvent<HTMLInputElement>, setPost: any) => {
  const file = event.target.files?.[0];
  if (!file) return;
  setProductImage(p => ({...p, name: file.name }));
  const reader = new FileReader();
  reader.onloadend = () => {
    const b64 = reader.result as string;
    setProductImage(p => ({...p, b64 }));
    setPost((p: any) => ({...p, image: b64 }))
  };
  reader.readAsDataURL(file);
};

  const { data: categories, error } = useSWR(
    [apiUrl(`/category`), token],
    fetcherCategories
  );

  const categories_as_options = useMemo(
    () =>
      categories?.map((category: { id: any; name: any }) => ({
        value: category.id,
        label: category.name,
      })) || [],
    [categories]
  );

  const colunas =
    ({ onUpdate, onRemove, getPost, onStatusChange }: ColumnFn) =>
    () =>
      [
        {
          Header: "Name",
          accessor: "name",
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
              <div className="text-end">
                <EditButton className="me-2" onClick={() => onUpdate(value)} />

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

  const initialData = useMemo(() => {
    let data = null;

    data = {
      active: true,
      description: {pt: '', en: '', es: ''},
      guarantees: {pt: '', en: '', es: ''},
      language: 'pt-BR',
      lang: 'pt-BR',
      image: productImage?.b64,
      enabledOnNutrition: true,
      enabledOnFertility: true
    };

    if (categories_as_options && categories_as_options.length) {
      data = {
        ...data,
        categoryId: categories_as_options[0].value,
      };
    }

    // if (language) {
    //   data = {
    //     ...data,
    //     lang: language,
    //   };
    // }

    return data;
  }, [categories_as_options, productImage?.b64]);

  return (
    <LayoutDefault>
      <PostType
        initialPostData={initialData}
        csvData={csvData}
        onCloseModal={() => setProductImage({})}
        dataConfig={{
          url,
          token,
          updateFn: async (
            updateUrl = "",
            url = "",
            options = {},
            post = { category: {} },
            fetcherDataFn = (result: any) => {}
          ) => {
            // @ts-expect-error
            delete post.category;

            await axios.patch(updateUrl, post, options);
            const result = await axios.get(url, options);

            return fetcherDataFn(result);
          },
          fetcherFn: (fetcherDataFn = () => {}, url = "", options = {}) =>
            axios
              .get(
                apiUrl(`/product?includes=category,analysis`),
                options
              )
              .then(fetcherDataFn),
          fetcherDataFn: (response: AxiosResponse) => {
            const products = response.data.products;

            var data_for_csv = products.map((product: any) => {
              return {
                ...product,
                minerals: "-",
                category: product.category?.name ?? "",
                calcio: getPostMineral(product, "ca"),
                silicio: getPostMineral(product, "si"),
                magnesio: getPostMineral(product, "mg"),
                boro: getPostMineral(product, "b"),
                enxofre: getPostMineral(product, "s"),
                nitrogenio: getPostMineral(product, "n"),
              };
            });

            setCsvData(data_for_csv);

            return products;
          },
        }}
        formConfig={{
          insertTitle: "Adicionar Produto",
          editTitle: "Editar Produto",
          fields,
        }}
        tableConfig={{
          columnsFn: colunas,
        }}
        pageConfig={{
          pageTitle: "Produtos",
        }}
      />
    </LayoutDefault>
  );
}
