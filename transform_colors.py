"""
Script pour transformer automatiquement toutes les couleurs dark mode vers SkySQL light mode
"""
import os
import re

# Mapping des transformations
TRANSFORMATIONS = {
    # Backgrounds
    r'bg-zinc-950': 'bg-card',
    r'bg-zinc-925': 'bg-muted',
    r'bg-zinc-900': 'bg-muted',
    r'bg-zinc-800': 'bg-muted/50',
    r'bg-zinc-700': 'bg-muted/70',
    r'bg-zinc-600': 'bg-muted-foreground/20',
    r'bg-zinc-500': 'bg-muted-foreground/30',
    r'bg-zinc-400': 'bg-muted-foreground/40',
    r'bg-zinc-300': 'bg-muted-foreground/50',
    r'bg-zinc-200': 'bg-muted',
    r'bg-zinc-100': 'bg-background',
    r'bg-zinc-50': 'bg-background',
    
    # Text colors
    r'text-zinc-950': 'text-foreground',
    r'text-zinc-900': 'text-foreground',
    r'text-zinc-800': 'text-foreground',
    r'text-zinc-700': 'text-foreground',
    r'text-zinc-600': 'text-muted-foreground',
    r'text-zinc-500': 'text-muted-foreground',
    r'text-zinc-400': 'text-muted-foreground',
    r'text-zinc-300': 'text-foreground',
    r'text-zinc-200': 'text-foreground',
    r'text-zinc-100': 'text-foreground',
    r'text-zinc-50': 'text-foreground',
    
    # Borders
    r'border-zinc-950': 'border-border',
    r'border-zinc-900': 'border-border',
    r'border-zinc-800': 'border-border',
    r'border-zinc-700': 'border-border',
    r'border-zinc-600': 'border-border',
    r'border-zinc-500': 'border-border',
    r'border-zinc-400': 'border-border',
    r'border-zinc-300': 'border-border',
    r'border-zinc-200': 'border-border',
    
    # Emerald -> Primary
    r'bg-emerald-500': 'bg-primary',
    r'bg-emerald-400': 'bg-primary',
    r'text-emerald-500': 'text-primary',
    r'text-emerald-400': 'text-primary',
    r'border-emerald-500': 'border-primary',
    r'border-emerald-400': 'border-primary',
    
    # Ring colors
    r'ring-emerald-500': 'ring-primary',
    r'ring-zinc-700': 'ring-border',
}

def transform_file(filepath):
    """Transforme un fichier TSX"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Appliquer toutes les transformations
        for old_pattern, new_value in TRANSFORMATIONS.items():
            content = re.sub(old_pattern, new_value, content)
        
        # Si le contenu a changé, écrire le fichier
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Erreur sur {filepath}: {e}")
        return False

def main():
    components_dir = r"c:\Users\Julien Fritsch\Documents\GitHub\MariaDB AI Demo Competition\frontend\src\components"
    
    transformed_count = 0
    total_files = 0
    
    # Parcourir tous les fichiers .tsx
    for root, dirs, files in os.walk(components_dir):
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                total_files += 1
                if transform_file(filepath):
                    transformed_count += 1
                    print(f"✓ Transformé: {file}")
    
    print(f"\n✅ Transformation terminée!")
    print(f"   Fichiers transformés: {transformed_count}/{total_files}")

if __name__ == "__main__":
    main()
