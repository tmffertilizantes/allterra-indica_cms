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
  state: number | null;
  value?: number;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
}

export default function SelectCity(props: Props) {
  const { token = "" } = useGlobal();
  const url = apiUrl(`/state/${props.state}?includes=city`);

  const fetcherCities = (url = "", token = "") =>
    axios
      .get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => res.data.state.cities);

  const { data: cities, error } = useSWR([url, token], fetcherCities);

  const cities_as_options = cities?.map((city: { id: number; name: any }) => ({
    value: city.id,
    label: city.name,
  }));

  return (
    <div className={props.className}>
      <label className="form-label">Cidade</label>

      {cities ? (
        <Select
          value={cities_as_options.find(
            (city: any) => city.value === props.value
          )}
          placeholder="Selecione a cidade..."
          classNamePrefix="select"
          className="mb-4"
          options={cities_as_options}
          isDisabled={props.state === null}
          onChange={props.onChange}
        />
      ) : (
        <Select
          placeholder="Selecione a cidade..."
          classNamePrefix="select"
          className="mb-4"
          isDisabled={props.state === null}
        />
      )}

      {/* <Form.Select
        name="cidade"
        id="cidade"
        value={props.value}
        aria-label="Default select example"
        onChange={props.onChange}
        disabled={props.state === null}
      >
        {cities?.map((city: Cidade, index: number) => (
          <option key={`city-${index}`} value={city.id}>
            {city.name}
          </option>
        ))}
      </Form.Select> */}
    </div>
  );
}
