# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for PostAI Backend Server

This creates a standalone executable that includes:
- Django framework
- All PostAI Django apps
- All dependencies (httpx, mcp, etc.)
"""

import os
import sys
from PyInstaller.utils.hooks import collect_all, collect_submodules, collect_data_files

block_cipher = None

# Get the backend directory path
backend_dir = os.path.dirname(os.path.abspath(SPEC))

# Collect all data files and hidden imports for our apps
datas = []
hiddenimports = []

# Django apps to include
django_apps = [
    'core',
    'collections_app',
    'environments_app',
    'requests_app',
    'workflows_app',
    'ai_app',
    'mcp_app',
    'proxy_app',
    'sync_app',
    'postai',
]

# Add each app's migrations and modules
for app in django_apps:
    app_path = os.path.join(backend_dir, app)
    if os.path.exists(app_path):
        # Add migrations
        migrations_path = os.path.join(app_path, 'migrations')
        if os.path.exists(migrations_path):
            datas.append((migrations_path, f'{app}/migrations'))

        # Add any templates
        templates_path = os.path.join(app_path, 'templates')
        if os.path.exists(templates_path):
            datas.append((templates_path, f'{app}/templates'))

        # Add any static files
        static_path = os.path.join(app_path, 'static')
        if os.path.exists(static_path):
            datas.append((static_path, f'{app}/static'))

        # Add hidden imports for the app
        hiddenimports.extend(collect_submodules(app))

# Collect Django and dependencies
django_datas, django_binaries, django_hiddenimports = collect_all('django')
datas.extend(django_datas)
hiddenimports.extend(django_hiddenimports)

# Additional dependencies that need special handling
additional_packages = [
    'rest_framework',
    'corsheaders',
    'httpx',
    'httpcore',
    'h11',
    'h2',
    'hpack',
    'hyperframe',
    'anyio',
    'sniffio',
    'certifi',
    'idna',
    'mcp',
    'pydantic',
    'pydantic_core',
    'anthropic',
    'openai',
    'dotenv',
    'sqlparse',
]

for pkg in additional_packages:
    try:
        pkg_datas, pkg_binaries, pkg_hiddenimports = collect_all(pkg)
        datas.extend(pkg_datas)
        hiddenimports.extend(pkg_hiddenimports)
    except Exception as e:
        print(f"Warning: Could not collect {pkg}: {e}")

# Manually add important hidden imports
hiddenimports.extend([
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.db.backends.sqlite3',
    'rest_framework.authentication',
    'rest_framework.permissions',
    'rest_framework.parsers',
    'rest_framework.renderers',
    'rest_framework.negotiation',
    'rest_framework.metadata',
    'rest_framework.schemas',
    'rest_framework.filters',
    'rest_framework.pagination',
    'rest_framework.decorators',
    'rest_framework.viewsets',
    'rest_framework.routers',
    'rest_framework.serializers',
    'corsheaders.middleware',
    'asyncio',
    'json',
    'sqlite3',
    'encodings',
    'encodings.utf_8',
    'encodings.ascii',
    'encodings.latin_1',
])

# Workflow engine modules
hiddenimports.extend([
    'workflows_app.engine',
    'workflows_app.engine.executor',
    'workflows_app.engine.nodes',
])

a = Analysis(
    ['postai_server.py'],
    pathex=[backend_dir],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'PIL',
        'cv2',
        'scipy',
        'IPython',
        'notebook',
        'pytest',
        'sphinx',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='postai-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=sys.platform == 'darwin',  # macOS only
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='postai-server',
)
