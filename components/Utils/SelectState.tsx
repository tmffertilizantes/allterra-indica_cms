import { apiUrl } from "../../lib/api";
import { useGlobal } from "@context/global";
import axios from "axios";
import { Cidade } from "models/cidade";
import { Estado } from "models/estado";
import { Form } from "react-bootstrap";
import Select, { ActionMeta, SingleValue } from "react-select";
import useSWR from "swr";

interface Props {
  className?: string;
  value: number;
  onChange: (
    newValue: SingleValue<number>,
    actionMeta: ActionMeta<number>
  ) => void;
}

export default function SelectState(props: Props) {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/state`);

  const fetcherStates = (url = "", token = "") =>
    axios
      .get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => res.data.states);

  const { data: states, error } = useSWR([url, token], fetcherStates);

  const states_as_options = states?.map((state: { id: number; name: any }) => ({
    value: state.id,
    label: state.name,
  }));

  return (
    <div className={props.className}>
      <label className="form-label">Estado</label>

        {states && (
          <Select
            value={states_as_options.find(
              (state: any) => state.value === props.value
            )}
            placeholder="Selecione o estado..."
            classNamePrefix="select"
            className="mb-4"
            options={states_as_options}
            onChange={props.onChange}
          />
        )}

      {/* <Form.Select
        name="estado"
        id="estado"
        value={props.value}
        aria-label="Default select example"
        onChange={props.onChange}
      >
        <option disabled selected>
          Selecione o estado
        </option>

        {states?.map((state: Estado, index: number) => (
          <option key={`state-${index}`} value={state.id}>
            {state.name}
          </option>
        ))}
      </Form.Select> */}
    </div>
  );
}
