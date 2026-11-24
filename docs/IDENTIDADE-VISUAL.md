# Identidade visual — 1ª IEC Brasília

Fonte oficial: `docs/marca/Manual da Marca - 1a IEC Brasilia.pdf` (novembro de 2026),
entregue pela comunicação da igreja. **Tudo o que for criado no site, no painel, no
boletim e nos apps deve seguir estas regras.** Em caso de dúvida, o manual manda.

## Elementos
- **Monte** (a curva), **horizonte** (a linha reta embaixo) e **cruz** (o único ponto vermelho).
- A cruz sempre pousa no ombro direito da curva. O horizonte é sempre reto.

## Logo
Arquivos oficiais em `public/marca/` (vetores redesenhados pela comunicação — nunca redesenhar):

| Formato | Quando usar | Mínimo digital |
|---|---|---|
| Horizontal (`logo-horizontal-*.svg`) | cabeçalho, rodapé, faixas estreitas | 260 px de largura |
| Vertical (`logo-vertical-*.svg`) | capas, banners, telas de abertura | 160 px |
| Símbolo (`logo-simbolo-*.svg`, `/simbolo*.svg`) | favicon, ícone, marca d'água, quando o nome já aparece perto | 40 px |

- Colorida sobre branco é a preferida. **Sobre azul, a negativa** (branca com cruz vermelha).
  Sobre fotos/fundos médios, a branca.
- Área de proteção: ½ x livre em volta (x = altura da cruz).
- Proibido: distorcer, girar, trocar cores, sombra/brilho/contorno/3D/degradê, fundo vermelho.

## Cores (fixas em `src/styles.css`)
| Nome | HEX | Uso | Classe Tailwind |
|---|---|---|---|
| Branco | `#FFFFFF` | base · 60% | `bg-white`, `bg-fundo` |
| Névoa | `#F3F6F9` | fundos de apoio | `bg-papel`, `bg-nevoa`, `bg-marca-clara` |
| Azul Congregacional | `#00436F` | principal · 30–35%: títulos, botões, áreas de destaque | `marca` |
| Azul Noite | `#002A47` | fundos escuros | `marca-funda` |
| Azul Céu | `#D9E6EF` | linhas e tons claros | `linha`, `ceu`, `marca-suave` |
| Azul Médio | `#5B7F99` | texto secundário | `tinta-suave`, `marca-media` |
| Grafite | `#1D2B36` | texto corrido | `tinta` |
| Vermelho Cruz | `#CC2127` | **só detalhes · até 5%** | `destaque` |

**Onde o vermelho pode aparecer:** a cruz da logo; a cruzinha antes dos sobretítulos
(`rotulo-secao`); um traço curto acima de nomes/assinaturas (`filete`); selos de urgência
("ao vivo", "inscrições"). Nunca botões vermelhos, fundos vermelhos ou textos longos em vermelho.

## Tipografia
- **Montserrat** em tudo (títulos Bold com espaçamento levemente fechado; textos Regular/Medium em grafite).
- **Lora Itálico** só em versículos e citações (`escritura`).
- **Sobretítulos:** MAIÚSCULAS, Bold, bem espaçados (0,24em), com a cruzinha vermelha antes → `rotulo-secao`.
- **Referência bíblica:** maiúsculas espaçadas abaixo do versículo → `referencia`.
- Textos longos justificados (`texto-justificado` / `texto-corrido`).

## Componentes do site
- **Cantos retos** em tudo (regra global em `.site`); círculos só para ícones, avatares e pontos.
- **Botões:** azuis, maiúsculas espaçadas (0,14em), Bold → `btn-primario`, `btn-contorno`;
  sobre azul: `btn-branco` / `btn-claro`.
- **Cabeçalho** branco com a logo horizontal colorida. **Rodapé** azul com a logo negativa.
- **Primeira dobra:** foto dentro do monte (`<MonteFoto>`) + linha do horizonte. Use a foto no monte
  com moderação (no máximo uma peça a cada três).
- **Cartões de horário/evento:** filete azul de 3–4 px no topo.
- **Grafismo Monte** como fundo leve: `grafismo-monte-escuro` (branco 8–15% sobre azul) e
  `grafismo-monte-claro` (azul-céu sobre claro). Nunca competindo com o texto.
- **Ícones:** só os oficiais (`public/marca/icones/`), traço reto e pontas arredondadas, sobre círculo azul.

## Fora do site
O manual também define Instagram, YouTube, projeção (telão), impressos e camisas —
consulte o PDF ao criar qualquer peça.

## Boletim (src/components/boletim)
Modelo da marca desde 24/11/2026: capa em faixa azul com a logo negativa, a data e o
versículo "Martelando a Palavra" (Lora Itálico); páginas internas com cabeçalho discreto
(símbolo + data) e rodapé com filete vermelho e número da página; pastoral com capitular
azul e assinatura com filete; tabelas com faixas azuis e linhas em névoa; expediente em
azul-noite. Fontes embutidas em public/fontes (Montserrat e Lora) para o PDF sair igual.
