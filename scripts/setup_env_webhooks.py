#!/usr/bin/env python3
"""
Script para configurar webhooks no .env e substituir URLs hardcoded por variáveis de ambiente.
"""

import os
import re
import sys
from pathlib import Path

def find_webhook_urls(content):
    """
    Encontra todas as URLs de webhook no conteúdo do arquivo.
    """
    # Padrão para capturar URLs https://inov-n8n.grpotencial.com.br/webhook/...
    pattern = r'["\']?(https://inov-n8n\.grpotencial\.com\.br/webhook/[a-f0-9\-]+)["\']?'
    matches = re.findall(pattern, content, re.IGNORECASE)
    return list(set(matches))  # Remove duplicatas

def generate_env_var_name(url):
    """
    Gera um nome de variável de ambiente baseado na URL do webhook.
    """
    # Extrair o ID do webhook da URL
    webhook_id = url.split('/')[-1]
    
    # Mapear IDs conhecidos para nomes mais descritivos
    webhook_mapping = {
        '6b593e1c-4982-44f1-b9f5-2af0d146b1ed': 'VITE_CONVERSATION_WEBHOOK_URL',
        # Adicionar outros mapeamentos conforme necessário
    }
    
    if webhook_id in webhook_mapping:
        return webhook_mapping[webhook_id]
    
    # Nome genérico baseado no ID
    return f'VITE_WEBHOOK_{webhook_id.replace("-", "_").upper()}_URL'

def update_env_file(env_path, webhooks):
    """
    Atualiza o arquivo .env com as URLs dos webhooks.
    """
    env_content = ""
    
    # Ler conteúdo existente se o arquivo existe
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            env_content = f.read()
    
    # Adicionar webhooks ao .env se não existirem
    webhooks_added = []
    for url in webhooks:
        env_var = generate_env_var_name(url)
        
        # Verificar se a variável já existe no .env
        if f'{env_var}=' not in env_content:
            env_content += f'\n# Webhook URLs\n{env_var}={url}\n'
            webhooks_added.append((env_var, url))
    
    # Adicionar variáveis de autenticação se não existirem
    auth_vars = [
        'HTTP_REQUEST_NAME=Authorization',
        'HTTP_REQUEST_VALOR=Bearer your-token-here'
    ]
    
    for auth_var in auth_vars:
        var_name = auth_var.split('=')[0]
        if f'{var_name}=' not in env_content:
            env_content += f'\n# HTTP Authentication\n{auth_var}\n'
            print(f"➕ Adicionada variável de autenticação: {var_name}")
    
    # Salvar arquivo .env atualizado
    if webhooks_added:
        with open(env_path, 'w', encoding='utf-8') as f:
            f.write(env_content)
        
        print(f"📝 Arquivo .env atualizado com {len(webhooks_added)} webhooks:")
        for env_var, url in webhooks_added:
            print(f"   {env_var} = {url}")
    
    return webhooks_added

def replace_hardcoded_urls(file_path, webhooks):
    """
    Substitui URLs hardcoded por variáveis de ambiente no arquivo.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    replacements_made = []
    
    for url in webhooks:
        env_var = generate_env_var_name(url)
        
        # Padrões para substituição
        patterns = [
            (f'"{url}"', f'import.meta.env.{env_var}'),
            (f"'{url}'", f'import.meta.env.{env_var}'),
            (f'`{url}`', f'import.meta.env.{env_var}'),
        ]
        
        for old_pattern, new_pattern in patterns:
            if old_pattern in content:
                content = content.replace(old_pattern, new_pattern)
                replacements_made.append((old_pattern, new_pattern))
    
    # Salvar arquivo se houve mudanças
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return replacements_made
    
    return []

def should_process_file(file_path):
    """
    Verifica se o arquivo deve ser processado.
    """
    extensions = {'.ts', '.tsx', '.js', '.jsx'}
    return file_path.suffix in extensions

def setup_webhooks(project_root):
    """
    Configura webhooks no projeto.
    """
    project_path = Path(project_root)
    env_path = project_path / '.env'
    
    if not project_path.exists():
        print(f"Erro: Diretório {project_root} não encontrado!")
        return False
    
    # Diretórios a serem ignorados
    ignore_dirs = {'node_modules', '.git', 'dist', 'build', '.next', 'scripts'}
    
    all_webhooks = set()
    files_processed = 0
    files_modified = 0
    
    # Primeira passada: encontrar todas as URLs de webhook
    print("🔍 Procurando URLs de webhook no projeto...")
    
    for file_path in project_path.rglob('*'):
        if file_path.is_dir():
            continue
            
        if any(ignore_dir in file_path.parts for ignore_dir in ignore_dirs):
            continue
            
        if not should_process_file(file_path):
            continue
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            webhooks = find_webhook_urls(content)
            if webhooks:
                all_webhooks.update(webhooks)
                print(f"📁 {file_path.relative_to(project_path)}: {len(webhooks)} webhooks encontrados")
            
        except Exception as e:
            print(f"❌ Erro ao processar {file_path}: {e}")
    
    if not all_webhooks:
        print("ℹ️ Nenhuma URL de webhook encontrada no projeto.")
        return True
    
    # Atualizar arquivo .env
    print(f"\n📝 Atualizando arquivo .env...")
    update_env_file(env_path, all_webhooks)
    
    # Segunda passada: substituir URLs hardcoded
    print(f"\n🔄 Substituindo URLs hardcoded por variáveis de ambiente...")
    
    for file_path in project_path.rglob('*'):
        if file_path.is_dir():
            continue
            
        if any(ignore_dir in file_path.parts for ignore_dir in ignore_dirs):
            continue
            
        if not should_process_file(file_path):
            continue
        
        try:
            replacements = replace_hardcoded_urls(file_path, all_webhooks)
            files_processed += 1
            
            if replacements:
                files_modified += 1
                print(f"✅ {file_path.relative_to(project_path)}: {len(replacements)} substituições")
                
        except Exception as e:
            print(f"❌ Erro ao processar {file_path}: {e}")
    
    print(f"\n📊 Resumo:")
    print(f"   Webhooks encontrados: {len(all_webhooks)}")
    print(f"   Arquivos processados: {files_processed}")
    print(f"   Arquivos modificados: {files_modified}")
    
    return True

def main():
    """
    Função principal do script.
    """
    # Obter diretório do projeto
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    print("🔧 Configurando webhooks no .env...")
    print(f"📁 Diretório do projeto: {project_root}")
    print()
    
    success = setup_webhooks(project_root)
    
    if success:
        print("\n✅ Configuração de webhooks concluída!")
        print("\n📋 Próximos passos:")
        print("   1. Verifique o arquivo .env e ajuste as URLs conforme necessário")
        print("   2. Configure as variáveis HTTP_REQUEST_NAME e HTTP_REQUEST_VALOR")
        print("   3. Teste a aplicação para garantir que os webhooks funcionam")
    else:
        print("\n❌ Erro durante a configuração!")
        sys.exit(1)

if __name__ == "__main__":
    main()
