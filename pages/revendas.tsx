import { apiUrl } from "../lib/api";
import { catalogDataConfig } from "@components/postType/catalogDataConfig";
import LayoutDefault from "@components/Layouts/default";
import { PostType } from "@components/postType";
import { useGlobal } from "@context/global";
import { AxiosResponse } from "axios";

interface CustomComponent {
  post: any;
  setPost: Function;
}

export default function Revendas() {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/resale`);

  const fields = [
    {
      field: "name",
      label: "Nome",
      placeholder: "Nome",
    },
  ];

  const initialData = {
    active: true
  }

  return (
    <LayoutDefault>
      <PostType
        initialPostData={initialData}
        dataConfig={{
          url,
          token,
          // v1/v2 por lib/catalogs.ts (specs/023): na v2 só os campos do DTO vão no corpo.
          ...catalogDataConfig("resale"),
          fetcherDataFn: (response: AxiosResponse) => response.data.resales,
        }}
        formConfig={{
          insertTitle: "Adicionar Revenda",
          editTitle: "Editar Revenda",
          fields,
        }}
        pageConfig={{
          pageTitle: "Revendas",
        }}
      />
    </LayoutDefault>
  );
}
