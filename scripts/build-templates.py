"""Converte os modelos Word originais da SPMS em templates com marcadores
docxtemplater ({campo}, {#lista}{.}{/lista}), mantendo cabeçalho, rodapé,
logótipo e estilos. Corre-se uma vez (os templates gerados ficam em
templates/). Uso: python3 scripts/build-templates.py <oficio.docx> <informacao.docx>
"""
import re
import sys
import zipfile

T = re.compile(r'(<w:t(?: [^>]*)?>)([^<]*)(</w:t>)')


def top_level(body):
    """Divide o <w:body> nos seus elementos de topo (w:p, w:tbl, ...)."""
    out, pos = [], 0
    while pos < len(body):
        m = re.match(r'<(w:[A-Za-z]+)\b', body[pos:])
        tag = m.group(1)
        head_end = pos + body[pos:].index('>') + 1
        if body[head_end - 2] == '/':
            out.append(body[pos:head_end]); pos = head_end; continue
        depth = 0
        for mm in re.finditer(r'<(/?)' + tag + r'\b[^>]*?(/?)>', body[pos:]):
            if mm.group(2) == '/':
                continue
            depth += -1 if mm.group(1) else 1
            if depth == 0:
                end = pos + mm.end(); break
        out.append(body[pos:end]); pos = end
    return out


def text_of(xml):
    return ''.join(t for _, t, _ in T.findall(xml))


def set_texts(xml, mapping):
    """Substitui o texto de cada <w:t> cujo conteúdo esteja em mapping
    (por ordem de ocorrência: mapping[texto] pode ser lista)."""
    counters = {}

    def rep(m):
        txt = m.group(2)
        if txt in mapping:
            v = mapping[txt]
            if isinstance(v, list):
                i = counters.get(txt, 0); counters[txt] = i + 1
                v = v[i % len(v)]
            return m.group(1).replace('<w:t>', '<w:t xml:space="preserve">') + v + m.group(3)
        return m.group(0)
    return T.sub(rep, xml)


def only_text(par, value):
    """Deixa no parágrafo só o primeiro <w:t> com `value` (preserva pPr e o
    primeiro rPr); os restantes textos ficam vazios."""
    first = [True]

    def rep(m):
        if first[0]:
            first[0] = False
            return '<w:t xml:space="preserve">' + value + m.group(3)
        return m.group(1) + m.group(3)
    return T.sub(rep, par)


def loop_pars(par, name, inner='{.}'):
    """Repetição de parágrafos (paragraphLoop): as marcas de início e fim
    ficam em parágrafos próprios, que o docxtemplater remove."""
    return [only_text(par, '{#' + name + '}'), only_text(par, inner), only_text(par, '{/' + name + '}')]


def strip_comments(xml):
    xml = re.sub(r'<w:commentRange(Start|End)[^>]*/>', '', xml)
    xml = re.sub(r'<w:r\b(?:(?!<w:r\b).)*?<w:commentReference[^>]*/>.*?</w:r>', '', xml, flags=re.S)
    return xml


def rewrite(src, dst, body_fn, drop_parts=()):
    zin = zipfile.ZipFile(src)
    zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
    for item in zin.infolist():
        if item.filename in drop_parts:
            continue
        data = zin.read(item.filename)
        if item.filename == 'word/document.xml':
            x = data.decode('utf8')
            b0 = x.index('<w:body>') + len('<w:body>'); b1 = x.index('</w:body>')
            x = x[:b0] + body_fn(top_level(x[b0:b1])) + x[b1:]
            x = x.replace('<w:showingPlcHdr/>', '')
            data = x.encode('utf8')
        elif item.filename == 'word/_rels/document.xml.rels' and drop_parts:
            x = data.decode('utf8')
            for part in drop_parts:
                target = part.replace('word/', '')
                x = re.sub(r'<Relationship [^>]*Target="' + re.escape(target) + r'"/>', '', x)
            data = x.encode('utf8')
        elif item.filename == '[Content_Types].xml' and drop_parts:
            x = data.decode('utf8')
            for part in drop_parts:
                x = re.sub(r'<Override PartName="/' + re.escape(part) + r'"[^>]*/>', '', x)
            data = x.encode('utf8')
        zout.writestr(item, data)
    zout.close()


def oficio_body(els):
    # 0: caixa do destinatário (texto repetido em Choice/Fallback)
    els[0] = set_texts(els[0], {
        'Exm': '{tratamento}', 'a': '', '. Senhor': '', 'Dra. ': '{destNome}',
        'cargo': '{destCargo}', 'instituição': '{destInstituicao}',
        'morada': '{destMorada}', 'código postal': '{destCodigoPostal}',
    })
    # 8: referências e assunto (também em caixa de texto, duplicado)
    el = els[8]
    parts = re.split(r'(<w:sdt>.*?</w:sdt>)', el, flags=re.S)
    for i, p in enumerate(parts):
        if 'NUMERO_REFDOCUMENTO' in p:
            parts[i] = set_texts(p, {'     ': '{vossaRef}'})
        elif 'NUMERO_DOCUMENTO' in p:
            parts[i] = set_texts(p, {'     ': '{nossaRef}'})
    el = ''.join(parts)
    # o " " a seguir a "Assunto:" passa a ter o assunto
    el = re.sub(r'(Assunto:</w:t>.*?<w:t(?: [^>]*)?>) (</w:t>)', r'\1 {assunto}\2', el, flags=re.S)
    els[8] = el
    els[16] = only_text(els[16], '{saudacao}')
    # corpo: um parágrafo repetido por cada parágrafo do texto
    els[18:23] = loop_pars(els[18], 'corpo')
    # índices mudaram: remover 4 elementos (19..22)
    idx = next(i for i, e in enumerate(els) if 'Com os melhores cumprimentos' in text_of(e))
    els[idx] = only_text(els[idx], '{fecho}')
    idx = next(i for i, e in enumerate(els) if 'Presidente' in text_of(e))
    els[idx] = only_text(els[idx], '{signatarioCargo}')
    els[idx + 1] = only_text(els[idx + 1], '{signatarioNome}')
    idx = next(i for i, e in enumerate(els) if 'DANAD UIA' in text_of(e))
    els[idx] = set_texts(els[idx], {
        'DANAD UIA': '{unidadeSigla}', 'Sigla da pessoa ': '{autorSigla}', 'q': '', ' faz o ': '', 'ofício': '',
    })
    return ''.join(els)


def informacao_body(els):
    els = [strip_comments(e) for e in els]
    # 0: caixas Parecer | Despacho/Deliberação
    tbl = els[0]
    cells = re.findall(r'<w:tc>.*?</w:tc>', tbl, re.S)
    parecer = cells[0]
    ps = re.findall(r'<w:p[ >].*?</w:p>', parecer, re.S)
    def cell_par(src, text):
        run = '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">' + text + '</w:t></w:r>'
        return src.replace('</w:pPr>', '</w:pPr>' + run, 1) if '</w:pPr>' in src else src.replace('</w:p>', run + '</w:p>')
    loop = ''.join(cell_par(ps[1], t) for t in ('{#pareceres}', '{.}', '{/pareceres}'))
    parecer_new = parecer.replace(ps[1], loop, 1)
    despacho = cells[2]
    dps = re.findall(r'<w:p[ >].*?</w:p>', despacho, re.S)
    label = dps[0]
    ppr = re.search(r'<w:pPr>.*?</w:pPr>', label, re.S)
    ppr = re.sub(r'<w:jc [^>]*/>', '', ppr.group(0)) if ppr else ''
    extra = ''.join('<w:p>' + ppr + '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>'
                    for t in ('{#despachos}', '{.}', '{/despachos}'))
    despacho_new = despacho.replace(label, label + extra, 1)
    els[0] = tbl.replace(parecer, parecer_new, 1).replace(despacho, despacho_new, 1)
    # 3: N.º / Data / Assunto
    t2 = els[3]
    t2 = set_texts(t2, {'DANAD': '{numero}', '/2024': '', ' - ': '', 'XX': '', '/202': '', '4': ''})
    t2 = set_texts(t2, {'12': '{data}', 'abril': '', ' de 202': ''})
    subj = ['Reuniões ', 'entre direções de ', 'SISTEMAS de INFORMAçÃO', ' e C', 'onselho de a', 'D',
            'ministração daS SPMS, E.P.E', '.']
    t2 = set_texts(t2, {s: ('{assunto}' if k == 0 else '') for k, s in enumerate(subj)})
    els[3] = t2
    # secções: Enquadramento (6), Análise (9..13), Conclusão (16..17)
    enq = loop_pars(els[6], 'enquadramento')
    ana = loop_pars(els[9], 'analise')
    con = loop_pars(els[17], 'conclusao')
    names_tbl = els[20]
    name_par = next(p for p in re.findall(r'<w:p[ >].*?</w:p>', names_tbl, re.S) if 'Bruno Trigo' in text_of(p))
    signatarios = [only_text(els[19], '{#signatarios}'), only_text(els[19], '{unidade}'),
                   only_text(name_par, '{nome}'), only_text(els[19], '{/signatarios}')]
    anexos = [only_text(els[21], '{#temAnexos}'), only_text(els[21], 'Anexos: {anexos}'),
              only_text(els[21], '{/temAnexos}')]
    new = (els[0:6] + enq + [els[7], els[8]] + ana + [els[14], els[15]] + con
           + [els[18], els[19], els[4]] + signatarios + [els[4]] + anexos + [els[-1]])
    return ''.join(new)


if __name__ == '__main__':
    oficio_src, informacao_src = sys.argv[1], sys.argv[2]
    rewrite(oficio_src, 'templates/oficio.docx', oficio_body)
    comment_parts = ('word/comments.xml', 'word/commentsExtended.xml', 'word/commentsIds.xml',
                     'word/commentsExtensible.xml', 'word/people.xml')
    rewrite(informacao_src, 'templates/informacao.docx', informacao_body, drop_parts=comment_parts)
    print('ok')
