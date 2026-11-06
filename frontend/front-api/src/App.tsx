
import { useState } from "react";
import "./index.css";

// Estrutura de um produto retornado pela API Django
type Produto = {
  id: number;
  name: string;
  descripition: string;
};

const API_URL = "http://localhost:8000";

function App() {
  // Autenticação
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [autenticado, setAutenticado] = useState(false);

  // Produtos
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  // Interface
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Busca o cookie CSRF no Django
  async function buscarCSRF() {
    const response = await fetch(`${API_URL}/api/login/?next=/`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Não foi possível obter o token CSRF.");
    }
  }

  // Obtém o token CSRF armazenado no navegador
  function obterTokenCSRF(): string | undefined {
    return document.cookie
      .split("; ")
      .find((item) => item.startsWith("csrftoken="))
      ?.split("=")[1];
  }

  // Lê e apresenta os erros retornados pela API
  async function obterErro(response: Response): Promise<string> {
    const texto = await response.text();

    if (!texto) {
      return `Erro na requisição. Status: ${response.status}`;
    }

    try {
      const dados: unknown = JSON.parse(texto);

      if (dados && typeof dados === "object") {
        if ("detail" in dados && typeof dados.detail === "string") {
          return dados.detail;
        }

        return Object.entries(dados)
          .map(([campo, erro]) => {
            const mensagemErro = Array.isArray(erro)
              ? erro.join(", ")
              : String(erro);

            return `${campo}: ${mensagemErro}`;
          })
          .join(" | ");
      }
    } catch {
      return texto;
    }

    return texto;
  }

  // GET - Busca todos os produtos
  async function carregarProdutos(): Promise<void> {
    const response = await fetch(`${API_URL}/produtos/`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await obterErro(response));
    }

    const dados: unknown = await response.json();

    // A API pode retornar uma lista simples ou uma lista paginada
    let lista: unknown[];

    if (Array.isArray(dados)) {
      lista = dados;
    } else if (
      dados !== null &&
      typeof dados === "object" &&
      "results" in dados &&
      Array.isArray(dados.results)
    ) {
      lista = dados.results;
    } else {
      throw new Error("A API retornou um formato de dados inesperado.");
    }

    // Confere se os produtos possuem os campos esperados
    const produtosRecebidos = lista.filter(
      (item): item is Produto =>
        item !== null &&
        typeof item === "object" &&
        "id" in item &&
        typeof item.id === "number" &&
        "name" in item &&
        typeof item.name === "string" &&
        "descripition" in item &&
        typeof item.descripition === "string"
    );

    setProdutos(produtosRecebidos);
  }

  // LOGIN - Autentica o usuário no Django
  async function fazerLogin() {
    try {
      if (!usuario.trim() || !senha) {
        throw new Error("Preencha o usuário e a senha.");
      }

      setCarregando(true);
      setMensagem("Autenticando...");

      // Primeiro obtém o CSRF
      await buscarCSRF();

      const csrfToken = obterTokenCSRF();

      if (!csrfToken) {
        throw new Error("Token CSRF não encontrado.");
      }

      // Prepara os dados do formulário de login
      const dados = new URLSearchParams();

      dados.append("username", usuario);
      dados.append("password", senha);
      dados.append("csrfmiddlewaretoken", csrfToken);
      dados.append("next", "/");

      // Envia o login para o Django
      const response = await fetch(`${API_URL}/api/login/?next=/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRFToken": csrfToken,
        },
        body: dados,
      });

      if (!response.ok) {
        throw new Error(await obterErro(response));
      }

      // Confirma a autenticação tentando acessar a API protegida
      await carregarProdutos();

      setAutenticado(true);
      setMensagem("Login realizado com sucesso!");
      setSenha("");
    } catch (error) {
      console.error("Erro no login:", error);

      setMensagem(
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao realizar login."
      );
    } finally {
      setCarregando(false);
    }
  }

  // POST - Cadastra um novo produto
  async function criarProduto() {
    try {
      if (!nome.trim() || !descricao.trim()) {
        throw new Error("Preencha o nome e a descrição do produto.");
      }

      setCarregando(true);
      setMensagem("Cadastrando produto...");

      const csrfToken = obterTokenCSRF();

      if (!csrfToken) {
        throw new Error("Token CSRF não encontrado.");
      }

      const response = await fetch(`${API_URL}/produtos/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          name: nome.trim(),
          descripition: descricao.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await obterErro(response));
      }

      await carregarProdutos();

      setNome("");
      setDescricao("");
      setProdutoId("");
      setMensagem("Produto cadastrado com sucesso!");
    } catch (error) {
      console.error("Erro ao cadastrar:", error);

      setMensagem(
        error instanceof Error ? error.message : "Erro ao cadastrar produto."
      );
    } finally {
      setCarregando(false);
    }
  }

  // PUT - Atualiza um produto pelo ID
  async function atualizarProduto() {
    try {
      const id = Number(produtoId);

      if (!produtoId.trim() || !Number.isInteger(id) || id <= 0) {
        throw new Error("Informe um ID válido para atualizar.");
      }

      if (!nome.trim() || !descricao.trim()) {
        throw new Error("Preencha o nome e a descrição do produto.");
      }

      setCarregando(true);
      setMensagem("Atualizando produto...");

      const csrfToken = obterTokenCSRF();

      if (!csrfToken) {
        throw new Error("Token CSRF não encontrado.");
      }

      const response = await fetch(`${API_URL}/produtos/${id}/`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          name: nome.trim(),
          descripition: descricao.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await obterErro(response));
      }

      await carregarProdutos();

      setNome("");
      setDescricao("");
      setProdutoId("");
      setMensagem("Produto atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar:", error);

      setMensagem(
        error instanceof Error ? error.message : "Erro ao atualizar produto."
      );
    } finally {
      setCarregando(false);
    }
  }

  // DELETE - Exclui um produto pelo ID
  async function excluirProduto(id?: number) {
    try {
      const idParaExcluir = id ?? Number(produtoId);

      if (!Number.isInteger(idParaExcluir) || idParaExcluir <= 0) {
        throw new Error("Informe um ID válido para excluir.");
      }

      const confirmar = window.confirm(
        `Deseja realmente excluir o produto ${idParaExcluir}?`
      );

      if (!confirmar) return;

      setCarregando(true);
      setMensagem("Excluindo produto...");

      const csrfToken = obterTokenCSRF();

      if (!csrfToken) {
        throw new Error("Token CSRF não encontrado.");
      }

      const response = await fetch(
        `${API_URL}/produtos/${idParaExcluir}/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRFToken": csrfToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(await obterErro(response));
      }

      await carregarProdutos();

      // Limpa o formulário se o produto excluído estava selecionado
      if (Number(produtoId) === idParaExcluir) {
        limparFormulario();
      }

      setMensagem("Produto excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir:", error);

      setMensagem(
        error instanceof Error ? error.message : "Erro ao excluir produto."
      );
    } finally {
      setCarregando(false);
    }
  }

  // Preenche o formulário com os dados do produto escolhido
  function selecionarProduto(produto: Produto) {
    setProdutoId(String(produto.id));
    setNome(produto.name);
    setDescricao(produto.descripition);

    setMensagem(`Produto ${produto.id} selecionado para edição.`);
  }

  // Limpa os campos do formulário
  function limparFormulario() {
    setProdutoId("");
    setNome("");
    setDescricao("");
  }

  // Atualiza a lista manualmente
  async function atualizarLista() {
    try {
      setCarregando(true);
      await carregarProdutos();
      setMensagem("Lista atualizada!");
    } catch (error) {
      console.error(error);

      setMensagem(
        error instanceof Error ? error.message : "Erro ao atualizar a lista."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="app">
      {!autenticado ? (
        <div className="login-container">
          <h1>TaskFlow</h1>
          <p>Entre para acessar seus produtos</p>

          <input
            type="text"
            placeholder="Usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            disabled={carregando}
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={carregando}
          />

          <button onClick={fazerLogin} disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>

          <p className="mensagem">{mensagem}</p>
        </div>
      ) : (
        <main className="container">
          <header className="header">
            <div>
              <h1>TaskFlow</h1>
              <p>Gerenciamento de produtos</p>
            </div>

            <button onClick={atualizarLista} disabled={carregando}>
              {carregando ? "Carregando..." : "Atualizar lista"}
            </button>
          </header>

          <section className="formulario">
            <h2>Cadastrar / Editar produto</h2>

            <label htmlFor="produtoId">
              ID do produto (para atualizar ou excluir)
            </label>

            <input
              id="produtoId"
              type="number"
              min="1"
              placeholder="Digite o ID"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              disabled={carregando}
            />

            <label htmlFor="nome">Nome</label>

            <input
              id="nome"
              type="text"
              placeholder="Nome do produto"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={carregando}
            />

            <label htmlFor="descricao">Descrição</label>

            <textarea
              id="descricao"
              placeholder="Descrição do produto"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={carregando}
            />

            <div className="acoes">
              <button onClick={criarProduto} disabled={carregando}>
                Cadastrar
              </button>

              <button onClick={atualizarProduto} disabled={carregando}>
                Atualizar
              </button>

              <button
                className="botao-excluir"
                onClick={() => excluirProduto()}
                disabled={carregando}
              >
                Excluir pelo ID
              </button>

              <button
                className="botao-limpar"
                onClick={limparFormulario}
                disabled={carregando}
              >
                Limpar
              </button>
            </div>

            <p className="mensagem">{mensagem}</p>
          </section>

          <section className="lista-produtos">
            <h2>Produtos cadastrados</h2>

            {produtos.length === 0 ? (
              <p>Nenhum produto encontrado.</p>
            ) : (
              produtos.map((produto) => (
                <article className="produto-card" key={produto.id}>
                  <div>
                    <h3>{produto.name}</h3>
                    <p>{produto.descripition}</p>
                    <small>ID: {produto.id}</small>
                  </div>

                  <div className="acoes-card">
                    <button
                      onClick={() => selecionarProduto(produto)}
                      disabled={carregando}
                    >
                      Editar
                    </button>

                    <button
                      className="botao-excluir"
                      onClick={() => excluirProduto(produto.id)}
                      disabled={carregando}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
