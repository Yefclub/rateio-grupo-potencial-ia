#!/usr/bin/env python3
"""
Script para remover todas as declarações console.log, console.error, console.warn, etc.
do projeto TypeScript/JavaScript.
"""

import os
import re
import sys
from pathlib import Path

def clean_console_statements(content):
    """
    Remove todas as declarações console.* do conteúdo do arquivo.
    """
    # Padrões para capturar diferentes tipos de console statements
    patterns = [
        # console.log(...);
        r'^\s*console\.(log|error|warn|info|debug|trace)\s*\([^)]*\);\s*$',
        # console.log(...) sem ponto e vírgula
        r'^\s*console\.(log|error|warn|info|debug|trace)\s*\([^)]*\)\s*$',
        # console.log multi-linha
        r'^\s*console\.(log|error|warn|info|debug|trace)\s*\(',
    ]
    
    lines = content.split('\n')
    cleaned_lines = []
    skip_multiline = False
    multiline_pattern = None
    
    for line in lines:
        # Se estamos pulando uma declaração multi-linha
        if skip_multiline:
            # Procurar pelo fechamento da declaração
            if ')' in line:
                # Contar parênteses para saber se fechou
                open_parens = line.count('(')
                close_parens = line.count(')')
                if close_parens >= open_parens:
                    skip_multiline = False
                    continue
            continue
        
        # Verificar se a linha contém console statement
        is_console_line = False
        
        for pattern in patterns:
            if re.match(pattern, line, re.MULTILINE):
                is_console_line = True
                
                # Se é uma declaração multi-linha (sem fechamento)
                if '(' in line and ')' not in line:
                    skip_multiline = True
                    multiline_pattern = pattern
                break
        
        if not is_console_line:
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)

def should_process_file(file_path):
    """
    Verifica se o arquivo deve ser processado baseado na extensão.
    """
    extensions = {'.ts', '.tsx', '.js', '.jsx'}
    return file_path.suffix in extensions

def clean_project(project_root):
    """
    Limpa todos os console statements do projeto.
    """
    project_path = Path(project_root)
    
    if not project_path.exists():
        print(f"Erro: Diretório {project_root} não encontrado!")
        return False
    
    # Diretórios a serem ignorados
    ignore_dirs = {
        'node_modules', 
        '.git', 
        'dist', 
        'build', 
        '.next',
        'scripts'  # Ignorar o próprio diretório de scripts
    }
    
    files_processed = 0
    files_cleaned = 0
    
    # Percorrer todos os arquivos do projeto
    for file_path in project_path.rglob('*'):
        # Pular se for diretório
        if file_path.is_dir():
            continue
            
        # Pular se estiver em diretório ignorado
        if any(ignore_dir in file_path.parts for ignore_dir in ignore_dirs):
            continue
            
        # Pular se não for arquivo que deve ser processado
        if not should_process_file(file_path):
            continue
            
        try:
            # Ler conteúdo original
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            # Limpar console statements
            cleaned_content = clean_console_statements(original_content)
            
            files_processed += 1
            
            # Se houve mudanças, salvar arquivo
            if cleaned_content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(cleaned_content)
                
                files_cleaned += 1
                print(f"✅ Limpeza realizada: {file_path.relative_to(project_path)}")
            
        except Exception as e:
            print(f"❌ Erro ao processar {file_path}: {e}")
    
    print(f"\n📊 Resumo:")
    print(f"   Arquivos processados: {files_processed}")
    print(f"   Arquivos modificados: {files_cleaned}")
    
    return True

def main():
    """
    Função principal do script.
    """
    # Obter diretório do projeto (diretório pai do diretório scripts)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    print("🧹 Limpando console statements do projeto...")
    print(f"📁 Diretório do projeto: {project_root}")
    print()
    
    success = clean_project(project_root)
    
    if success:
        print("\n✅ Limpeza concluída com sucesso!")
    else:
        print("\n❌ Erro durante a limpeza!")
        sys.exit(1)

if __name__ == "__main__":
    main()
