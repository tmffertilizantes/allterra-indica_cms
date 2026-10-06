import { apiUrl } from "../lib/api";
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
