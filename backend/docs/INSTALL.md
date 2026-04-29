# ============================================
# INSTALAÇÃO DO BACKEND - SAPEE DEWAS
# Python 3.12.x
# ============================================

# 1. Navegar até a pasta do backend
cd backend

# 2. Criar ambiente virtual (RECOMENDADO)
python -m venv venv

# 3. Ativar ambiente virtual
# No Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# No Windows (CMD):
.\venv\Scripts\activate

# No Linux/Mac:
source venv/bin/activate

# 4. Atualizar pip
python -m pip install --upgrade pip

# 5. Instalar dependências
pip install -r requirements.txt

# 6. Verificar instalação
python --version
pip list

# 7. Testar imports
python -c "import fastapi; print('FastAPI:', fastapi.__version__)"
python -c "import sqlalchemy; print('SQLAlchemy:', sqlalchemy.__version__)"
python -c "import sklearn; print('Scikit-Learn:', sklearn.__version__)"

# ============================================
# POSSÍVEIS PROBLEMAS E SOLUÇÕES
# ============================================

# ERRO: passlib bcrypt
# SOLUÇÃO: pip install passlib[bcrypt]

# ERRO: cryptography
# SOLUÇÃO: pip install --upgrade cryptography

# ERRO: mysql-connector-python
# SOLUÇÃO: pip install --upgrade mysql-connector-python

# ERRO: numpy/scipy
# SOLUÇÃO: pip install --upgrade numpy scipy

# ============================================
# TESTAR CONEXÃO COM BANCO
# ============================================

# Criar arquivo .env primeiro!
# Depois testar:
python -c "from database import test_connection; test_connection()"
