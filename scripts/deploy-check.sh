#!/bin/bash

# Deployment Verification Script
# Run this after deployment to verify everything works

echo "🔍 Checking Deployment Status..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required environment variables are set
echo "📋 Checking Environment Variables..."
if [ -z "$VERCEL_URL" ] && [ -z "$RAILWAY_PUBLIC_DOMAIN" ]; then
    echo -e "${YELLOW}⚠️  Warning: Deployment URLs not set in environment${NC}"
    echo "   Please set VERCEL_URL and RAILWAY_PUBLIC_DOMAIN"
else
    echo -e "${GREEN}✅ Environment variables configured${NC}"
fi

# Check backend health
echo ""
echo "🏥 Checking Backend Health..."
if [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then
    BACKEND_URL="https://${RAILWAY_PUBLIC_DOMAIN}"
    HEALTH_CHECK=$(curl -s "${BACKEND_URL}/health" || echo "FAILED")
    
    if [[ $HEALTH_CHECK == *"ok"* ]]; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        echo "   Response: $HEALTH_CHECK"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
        echo "   URL: ${BACKEND_URL}/health"
    fi
else
    echo -e "${YELLOW}⚠️  RAILWAY_PUBLIC_DOMAIN not set${NC}"
fi

# Check frontend
echo ""
echo "🌐 Checking Frontend..."
if [ -n "$VERCEL_URL" ]; then
    FRONTEND_URL="https://${VERCEL_URL}"
    FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}" || echo "000")
    
    if [ "$FRONTEND_CHECK" = "200" ]; then
        echo -e "${GREEN}✅ Frontend is accessible${NC}"
        echo "   URL: ${FRONTEND_URL}"
    else
        echo -e "${RED}❌ Frontend check failed${NC}"
        echo "   HTTP Status: $FRONTEND_CHECK"
    fi
else
    echo -e "${YELLOW}⚠️  VERCEL_URL not set${NC}"
fi

echo ""
echo "✅ Deployment check complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Verify frontend loads correctly"
echo "   2. Test API endpoints"
echo "   3. Check database connectivity"
echo "   4. Review deployment logs for any errors"

