/** Unidade: lib/uploads.ts (specs/022 contracts/files-api.md §1). Adaptador axios falso. */
import { expect, test } from "@playwright/test";
import axios from "axios";
import { __setClientConfigForTests } from "../../lib/clientConfig";
import { uploadErrorMessage, uploadFile } from "../../lib/uploads";

const V1 = "https://v1.test/api/v1";
const V2 = "https://v2.test/api/v2";
let calls: { url: string; isForm: boolean }[] = [];
const originalAdapter = axios.defaults.adapter;

test.beforeEach(() => {
  process.env.API_URL = V1;
  process.env.API_URL_V2 = V2;
  calls = [];
  axios.defaults.adapter = async (config: any) => {
    calls.push({ url: config.url, isForm: config.data instanceof FormData });
    return { data: { success: true, file: `${V2}/file/1-a.pdf` }, status: 200, statusText: "OK", headers: {}, config };
  };
});

test.afterEach(() => {
  axios.defaults.adapter = originalAdapter;
  __setClientConfigForTests(null);
});

test("envia multipart para o destino do módulo upload e devolve o endereço", async () => {
  const file = new Blob(["%PDF-1.4"], { type: "application/pdf" }) as Blob & { name: string };
  expect(await uploadFile(Object.assign(file, { name: "a.pdf" }))).toBe(`${V2}/file/1-a.pdf`);
  expect(calls[0]).toEqual({ url: `${V1}/upload`, isForm: true });
  __setClientConfigForTests({ default: "v1", modules: { auth: "v2", upload: "v2" }, minAppVersion: "0.0.0" });
  await uploadFile(Object.assign(new Blob(["x"]), { name: "b.pdf" }));
  expect(calls[1].url).toBe(`${V2}/upload`);
});

test("mensagens para 400, 413 e falha genérica", () => {
  expect(
    uploadErrorMessage({ response: { status: 400, data: { message: "Tipo de arquivo não permitido" } } }),
  ).toBe("Tipo de arquivo não permitido. PDF, PNG, JPEG ou WebP, até 10 MB.");
  expect(uploadErrorMessage({ response: { status: 413 } })).toMatch(/acima do limite/);
  expect(uploadErrorMessage({})).toMatch(/tente novamente/);
});
