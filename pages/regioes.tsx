import { apiUrl } from "../lib/api";
import { catalogDataConfig } from "@components/postType/catalogDataConfig";
import LayoutDefault from "@components/Layouts/default";
import { PostType } from "@components/postType";
import { useGlobal } from "@context/global";
import axios, { AxiosResponse } from "axios";
import Select from "react-select";
import useSWR from "swr";

interface CustomComponent {
  post: any;
  setPost: Function;
}

export default function Regioes() {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/region`);

  const fields = [
    {
      field: "name",
      label: "Nome",
      placeholder: "Nome",
    },
  ];

  const initialData = {
    active: true,
  };

  return (
    <LayoutDefault>
      <PostType
        initialData={initialData}
        dataConfig={{
          url,
          token,
          // v1/v2 por lib/catalogs.ts (specs/023): na v2 só os campos do DTO vão no corpo.
          ...catalogDataConfig("region"),
          fetcherDataFn: (response: AxiosResponse) => {
            return response.data.regions
          },
        }}
        formConfig={{
          insertTitle: "Adicionar Região",
          editTitle: "Editar Região",
          fields,
        }}
        pageConfig={{
          pageTitle: "Regiões",
        }}
      />
    </LayoutDefault>
  );
}
