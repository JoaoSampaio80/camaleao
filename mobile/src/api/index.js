import { http } from "./http";

// Exemplo: endpoint de saúde/hello no seu Django
export async function getHello() {
  const { data } = await http.get("/hello/");
  return data;
}
