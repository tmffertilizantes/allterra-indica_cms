import { apiUrl } from "../lib/api";
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
