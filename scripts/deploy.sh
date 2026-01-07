#!/bin/bash

# VM到期管理系统部署脚本
# 用于自动化部署流程

set -e  # 遇到错误时退出

echo "🚀 VM到期管理系统部署脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必需的工具
check_requirements() {
    log_info "检查部署要求..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    # 检查 Vercel CLI（可选）
    if command -v vercel &> /dev/null; then
        log_success "Vercel CLI 已安装"
        VERCEL_CLI_AVAILABLE=true
    else
        log_warning "Vercel CLI 未安装，将跳过 CLI 部署选项"
        VERCEL_CLI_AVAILABLE=false
    fi
    
    log_success "环境检查完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    npm ci
    log_success "依赖安装完成"
}

# 环境变量检查
check_environment() {
    log_info "检查环境变量配置..."
    
    # 运行环境变量验证脚本
    if node scripts/validate-env.js; then
        log_success "环境变量验证通过"
    else
        log_error "环境变量验证失败，请检查配置"
        exit 1
    fi
}

# 数据库设置
setup_database() {
    log_info "设置数据库..."
    
    # 生成 Prisma 客户端
    npm run db:generate
    
    # 运行数据库迁移
    if [ "$NODE_ENV" = "production" ]; then
        log_info "运行生产环境数据库迁移..."
        npm run db:migrate:prod
    else
        log_info "运行开发环境数据库迁移..."
        npm run db:migrate
    fi
    
    log_success "数据库设置完成"
}

# 构建应用
build_application() {
    log_info "构建应用..."
    
    # 类型检查
    npm run type-check
    
    # 构建应用
    npm run build
    
    log_success "应用构建完成"
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    
    if npm run test; then
        log_success "所有测试通过"
    else
        log_warning "部分测试失败，请检查测试结果"
        read -p "是否继续部署？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "部署已取消"
            exit 1
        fi
    fi
}

# Vercel 部署
deploy_to_vercel() {
    if [ "$VERCEL_CLI_AVAILABLE" = true ]; then
        log_info "使用 Vercel CLI 部署..."
        
        # 检查是否已登录
        if ! vercel whoami &> /dev/null; then
            log_info "请先登录 Vercel..."
            vercel login
        fi
        
        # 部署
        if [ "$1" = "production" ]; then
            vercel --prod
        else
            vercel
        fi
        
        log_success "Vercel 部署完成"
    else
        log_info "Vercel CLI 不可用，请手动部署："
        echo "1. 将代码推送到 Git 仓库"
        echo "2. 在 Vercel 控制台导入项目"
        echo "3. 配置环境变量"
        echo "4. 触发部署"
    fi
}

# 部署后验证
post_deploy_verification() {
    log_info "部署后验证..."
    
    if [ -n "$DEPLOYMENT_URL" ]; then
        log_info "检查部署状态..."
        
        # 等待部署完成
        sleep 10
        
        # 健康检查
        if curl -f "$DEPLOYMENT_URL/api/health" > /dev/null 2>&1; then
            log_success "健康检查通过"
        else
            log_warning "健康检查失败，请手动验证部署"
        fi
    else
        log_info "请手动验证部署："
        echo "1. 访问应用 URL"
        echo "2. 检查健康状态：/api/health"
        echo "3. 测试登录功能"
        echo "4. 验证邮件通知"
    fi
}

# 主部署流程
main() {
    echo
    log_info "开始部署流程..."
    echo
    
    # 获取部署类型
    DEPLOY_TYPE=${1:-"preview"}
    
    if [ "$DEPLOY_TYPE" = "production" ]; then
        log_info "生产环境部署"
        export NODE_ENV=production
    else
        log_info "预览环境部署"
        export NODE_ENV=development
    fi
    
    # 执行部署步骤
    check_requirements
    echo
    
    install_dependencies
    echo
    
    check_environment
    echo
    
    setup_database
    echo
    
    build_application
    echo
    
    # 可选：运行测试
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
        echo
    fi
    
    # 部署到 Vercel
    deploy_to_vercel "$DEPLOY_TYPE"
    echo
    
    # 部署后验证
    post_deploy_verification
    echo
    
    log_success "部署完成！"
    
    # 显示后续步骤
    echo
    echo "📋 后续步骤："
    echo "1. 验证应用功能正常"
    echo "2. 检查邮件通知设置"
    echo "3. 配置监控和告警"
    echo "4. 更新文档和用户手册"
}

# 显示帮助信息
show_help() {
    echo "VM到期管理系统部署脚本"
    echo
    echo "用法："
    echo "  $0 [选项] [部署类型]"
    echo
    echo "部署类型："
    echo "  preview     预览部署（默认）"
    echo "  production  生产部署"
    echo
    echo "选项："
    echo "  -h, --help     显示帮助信息"
    echo "  --skip-tests   跳过测试"
    echo
    echo "环境变量："
    echo "  SKIP_TESTS=true    跳过测试执行"
    echo "  DEPLOYMENT_URL     部署后的应用 URL"
    echo
    echo "示例："
    echo "  $0                    # 预览部署"
    echo "  $0 production         # 生产部署"
    echo "  SKIP_TESTS=true $0    # 跳过测试的部署"
}

# 处理命令行参数
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    --skip-tests)
        export SKIP_TESTS=true
        shift
        main "$@"
        ;;
    *)
        main "$@"
        ;;
esac