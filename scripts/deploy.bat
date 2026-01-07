@echo off
REM VM到期管理系统部署脚本 (Windows版本)
REM 用于自动化部署流程

setlocal enabledelayedexpansion

echo 🚀 VM到期管理系统部署脚本
echo ================================

REM 设置颜色（Windows 10+）
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM 日志函数
:log_info
echo %BLUE%[INFO]%NC% %~1
goto :eof

:log_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:log_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:log_error
echo %RED%[ERROR]%NC% %~1
goto :eof

REM 检查必需的工具
:check_requirements
call :log_info "检查部署要求..."

REM 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    call :log_error "Node.js 未安装，请先安装 Node.js 18+"
    exit /b 1
)

REM 检查 npm
npm --version >nul 2>&1
if errorlevel 1 (
    call :log_error "npm 未安装"
    exit /b 1
)

REM 检查 Vercel CLI（可选）
vercel --version >nul 2>&1
if errorlevel 1 (
    call :log_warning "Vercel CLI 未安装，将跳过 CLI 部署选项"
    set "VERCEL_CLI_AVAILABLE=false"
) else (
    call :log_success "Vercel CLI 已安装"
    set "VERCEL_CLI_AVAILABLE=true"
)

call :log_success "环境检查完成"
goto :eof

REM 安装依赖
:install_dependencies
call :log_info "安装项目依赖..."
npm ci
if errorlevel 1 (
    call :log_error "依赖安装失败"
    exit /b 1
)
call :log_success "依赖安装完成"
goto :eof

REM 环境变量检查
:check_environment
call :log_info "检查环境变量配置..."

REM 运行环境变量验证脚本
node scripts/validate-env.js
if errorlevel 1 (
    call :log_error "环境变量验证失败，请检查配置"
    exit /b 1
)
call :log_success "环境变量验证通过"
goto :eof

REM 数据库设置
:setup_database
call :log_info "设置数据库..."

REM 生成 Prisma 客户端
npm run db:generate
if errorlevel 1 (
    call :log_error "Prisma 客户端生成失败"
    exit /b 1
)

REM 运行数据库迁移
if "%NODE_ENV%"=="production" (
    call :log_info "运行生产环境数据库迁移..."
    npm run db:migrate:prod
) else (
    call :log_info "运行开发环境数据库迁移..."
    npm run db:migrate
)

if errorlevel 1 (
    call :log_warning "数据库迁移可能失败，请检查"
)

call :log_success "数据库设置完成"
goto :eof

REM 构建应用
:build_application
call :log_info "构建应用..."

REM 类型检查
npm run type-check
if errorlevel 1 (
    call :log_error "类型检查失败"
    exit /b 1
)

REM 构建应用
npm run build
if errorlevel 1 (
    call :log_error "应用构建失败"
    exit /b 1
)

call :log_success "应用构建完成"
goto :eof

REM 运行测试
:run_tests
call :log_info "运行测试..."

npm run test
if errorlevel 1 (
    call :log_warning "部分测试失败，请检查测试结果"
    set /p "continue=是否继续部署？(y/N): "
    if /i not "!continue!"=="y" (
        call :log_info "部署已取消"
        exit /b 1
    )
) else (
    call :log_success "所有测试通过"
)
goto :eof

REM Vercel 部署
:deploy_to_vercel
if "%VERCEL_CLI_AVAILABLE%"=="true" (
    call :log_info "使用 Vercel CLI 部署..."
    
    REM 检查是否已登录
    vercel whoami >nul 2>&1
    if errorlevel 1 (
        call :log_info "请先登录 Vercel..."
        vercel login
    )
    
    REM 部署
    if "%~1"=="production" (
        vercel --prod
    ) else (
        vercel
    )
    
    call :log_success "Vercel 部署完成"
) else (
    call :log_info "Vercel CLI 不可用，请手动部署："
    echo 1. 将代码推送到 Git 仓库
    echo 2. 在 Vercel 控制台导入项目
    echo 3. 配置环境变量
    echo 4. 触发部署
)
goto :eof

REM 部署后验证
:post_deploy_verification
call :log_info "部署后验证..."

if defined DEPLOYMENT_URL (
    call :log_info "检查部署状态..."
    
    REM 等待部署完成
    timeout /t 10 /nobreak >nul
    
    REM 健康检查（使用 curl 或 PowerShell）
    curl -f "%DEPLOYMENT_URL%/api/health" >nul 2>&1
    if errorlevel 1 (
        call :log_warning "健康检查失败，请手动验证部署"
    ) else (
        call :log_success "健康检查通过"
    )
) else (
    call :log_info "请手动验证部署："
    echo 1. 访问应用 URL
    echo 2. 检查健康状态：/api/health
    echo 3. 测试登录功能
    echo 4. 验证邮件通知
)
goto :eof

REM 显示帮助信息
:show_help
echo VM到期管理系统部署脚本
echo.
echo 用法：
echo   %~nx0 [部署类型]
echo.
echo 部署类型：
echo   preview     预览部署（默认）
echo   production  生产部署
echo.
echo 环境变量：
echo   SKIP_TESTS=true    跳过测试执行
echo   DEPLOYMENT_URL     部署后的应用 URL
echo.
echo 示例：
echo   %~nx0                    # 预览部署
echo   %~nx0 production         # 生产部署
echo   set SKIP_TESTS=true ^& %~nx0    # 跳过测试的部署
goto :eof

REM 主部署流程
:main
echo.
call :log_info "开始部署流程..."
echo.

REM 获取部署类型
set "DEPLOY_TYPE=%~1"
if "%DEPLOY_TYPE%"=="" set "DEPLOY_TYPE=preview"

if "%DEPLOY_TYPE%"=="production" (
    call :log_info "生产环境部署"
    set "NODE_ENV=production"
) else (
    call :log_info "预览环境部署"
    set "NODE_ENV=development"
)

REM 执行部署步骤
call :check_requirements
echo.

call :install_dependencies
echo.

call :check_environment
echo.

call :setup_database
echo.

call :build_application
echo.

REM 可选：运行测试
if not "%SKIP_TESTS%"=="true" (
    call :run_tests
    echo.
)

REM 部署到 Vercel
call :deploy_to_vercel "%DEPLOY_TYPE%"
echo.

REM 部署后验证
call :post_deploy_verification
echo.

call :log_success "部署完成！"

REM 显示后续步骤
echo.
echo 📋 后续步骤：
echo 1. 验证应用功能正常
echo 2. 检查邮件通知设置
echo 3. 配置监控和告警
echo 4. 更新文档和用户手册

goto :eof

REM 处理命令行参数
if "%~1"=="-h" goto show_help
if "%~1"=="--help" goto show_help

call :main %*