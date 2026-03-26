-- 1. Tabela de Motoristas
CREATE TABLE IF NOT EXISTS public.motoristas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    contato_whatsapp TEXT,
    cpf TEXT UNIQUE,
    registro_cnh TEXT,
    vencimento_cnh DATE,
    categoria_cnh TEXT,
    data_nascimento DATE,
    status TEXT DEFAULT 'ATIVO', -- ATIVO ou INATIVO
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Veículos
CREATE TABLE IF NOT EXISTS public.veiculos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Dados Básicos
    placa TEXT NOT NULL UNIQUE,
    renavam TEXT,
    proprietario TEXT,
    classificacao TEXT, -- CASA, VENDIDO, BO
    -- Seguro
    seguradora TEXT,
    vencimento_seguro DATE,
    proponente_seguro TEXT,
    condutor_principal_id UUID REFERENCES public.motoristas(id),
    corretor_seguro TEXT,
    numero_apolice TEXT,
    endosso_proposta TEXT,
    ci_seguro TEXT,
    valor_franquia NUMERIC(10,2),
    valor_premio NUMERIC(10,2),
    valor_dia_seguro NUMERIC(10,2),
    forma_pagamento TEXT, -- BOLETO, CARTAO
    parcelas_pagamento INTEGER,
    -- Documentação
    nome_documento TEXT,
    cpf_cnpj TEXT,
    codigo_fipe TEXT,
    valor_fipe_mes NUMERIC(10,2),
    chassi TEXT,
    numero_motor TEXT,
    -- Detalhes Técnicos
    ano_fabricacao INTEGER,
    ano_modelo INTEGER,
    marca TEXT,
    modelo TEXT NOT NULL,
    cor TEXT,
    -- Aquisição
    data_aquisicao_nf DATE,
    data_saida_nf DATE,
    fornecedor_aquisicao TEXT,
    status TEXT DEFAULT 'ATIVO', -- ATIVO ou INATIVO
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar Real-time para ambas
ALTER PUBLICATION supabase_realtime ADD TABLE veiculos, motoristas;

-- Habitar RLS e abrir permissões para teste (Atenção: Em prod deve-se restringir)
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público total veiculos" ON public.veiculos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público total motoristas" ON public.motoristas FOR ALL USING (true) WITH CHECK (true);

-- View para facilitar a contagem de vínculos de seguro
CREATE OR REPLACE VIEW public.view_motoristas_vinculos AS
SELECT 
    m.*,
    (SELECT COUNT(*) FROM public.veiculos v WHERE v.condutor_principal_id = m.id) as quantidade_vinculo_seguro
FROM public.motoristas m;
