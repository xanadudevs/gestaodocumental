import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type UnitNode = {
  name: string;
  children?: UnitNode[];
};

// Organigrama a replicar. Estrutura: Conselho de Administração no topo,
// duas grandes áreas (Administração de Empresa / Serviços Partilhados) +
// o Encarregado de Proteção de Dados, depois Direções e as suas Unidades.
const ORG_CHART: UnitNode = {
  name: "Conselho de Administração",
  children: [
    { name: "Encarregado de Proteção de Dados" },
    {
      name: "Administração de Empresa",
      children: [
        {
          name: "Direção de Gestão Corporativa, Conformidade, Auditoria e Antifraude",
          children: [
            { name: "Gabinete de Assessoria Geral ao Conselho de Administração" },
            { name: "Unidade de Auditoria Interna e Conformidade" },
          ],
        },
        {
          name: "Direção de Administração Geral",
          children: [{ name: "Unidade de Apoio Geral" }, { name: "Unidade de Aprovisionamento" }],
        },
        {
          name: "Direção de Assuntos Jurídicos e Proteção de Dados",
          children: [{ name: "Unidade de Contencioso e Contratação Pública" }],
        },
        {
          name: "Direção Financeira",
          children: [{ name: "Unidade de Serviços Financeiros" }],
        },
        {
          name: "Direção de Recursos Humanos",
          children: [{ name: "Unidade de Recursos Humanos" }, { name: "Unidade Academia SPMS" }],
        },
        {
          name: "Direção de Planeamento e Desenvolvimento Organizacional",
          children: [
            { name: "Unidade de Controlo de Gestão e Contratualização" },
            { name: "Unidade do Plano de Recuperação e Resiliência" },
            { name: "Unidade de Cibersegurança" },
          ],
        },
        {
          name: "Direção de Comunicação e Relações Públicas",
          children: [{ name: "Unidade de Comunicação" }],
        },
      ],
    },
    {
      name: "Serviços Partilhados",
      children: [
        {
          name: "Centro Nacional de Telessaúde",
          children: [
            { name: "Unidade da Linha SNS 24" },
            { name: "Unidade Digital SNS 24" },
            { name: "Linha Nacional" },
            { name: "Adjunto CNTS" },
          ],
        },
        {
          name: "Direção do Centro de Controlo e Monitorização do SNS",
          children: [
            { name: "Unidade de Gestão Operacional" },
            { name: "Unidade de Gestão do Medicamento e do Dispositivo Médico" },
            { name: "Unidade de Sistemas de Informação do CCM" },
            { name: "Unidade de Sistemas de Gestão de Recursos" },
          ],
        },
        {
          name: "Direção de Infraestruturas, Redes e Suporte",
          children: [
            { name: "Unidade de Gestão de Serviço e Suporte" },
            { name: "Unidade de Operação e Segurança" },
            { name: "Unidade da Rede de Dados e Informação da Saúde" },
            { name: "Unidade de Centros de Dados" },
          ],
        },
        {
          name: "Direção de Sistemas dos Cuidados de Saúde",
          children: [
            { name: "Unidade de Sistemas de Gestão e Codificação Clínica" },
            { name: "Unidade de Sistemas de Cuidados de Saúde Pública" },
            { name: "Unidade de Sistemas de Cuidados de Saúde" },
            { name: "Unidade de Sistemas de Apoio à Clínica" },
            { name: "Adjunto DSCS" },
          ],
        },
        {
          name: "Direção de Arquitetura, Negócio e Análise de Dados",
          children: [
            { name: "Unidade de Planeamento, Arquitetura, Conformidade e Engenharia" },
            { name: "Unidade de Advanced Analytics, Inteligência Artificial e Robótica" },
            { name: "Unidade de Inovação Digital" },
            { name: "Unidade de Registos Nacionais" },
          ],
        },
        {
          name: "Central de Compras da Saúde",
          children: [
            { name: "Unidade de Compras Agregadas de Bens e Serviços da Saúde" },
            { name: "Unidade de Compras de Bens e Serviços Transversais" },
            { name: "Unidade de Gestão da Informação de Compras" },
          ],
        },
      ],
    },
  ],
};

async function upsertUnit(node: UnitNode, parentId: string | null, order: number): Promise<void> {
  const existing = await prisma.unit.findFirst({
    where: { name: node.name, parentId: parentId ?? undefined },
  });

  const unit = existing
    ? await prisma.unit.update({ where: { id: existing.id }, data: { order } })
    : await prisma.unit.create({ data: { name: node.name, parentId, order } });

  const children = node.children ?? [];
  for (let i = 0; i < children.length; i++) {
    await upsertUnit(children[i], unit.id, i);
  }
}

async function main() {
  console.log("A criar/atualizar a estrutura organizacional...");
  await upsertUnit(ORG_CHART, null, 0);

  const total = await prisma.unit.count();
  console.log(`Estrutura organizacional pronta: ${total} unidades/direções.`);

  console.log(
    "Os utilizadores são criados automaticamente no primeiro login (OAuth). " +
      "O primeiro a entrar torna-se ADMIN automaticamente. Atribui unidade/nível em /admin/users."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
