import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// Create server instance
const server = new McpServer({
    name: 'greeting-mcp-server',
    version: '1.0.0',
    capabilities: {
        tools: {},
        resources: {},
        prompts: {}
    }
})

// Greeting tool
server.tool(
    'greeting',
    {
        name: z.string().describe('인사할 사람의 이름'),
        language: z
            .enum(['ko', 'en', 'ja'])
            .optional()
            .default('ko')
            .describe('인사 언어 (기본값: ko)')
    },
    async ({ name, language }) => {
        let greeting: string
        switch (language) {
            case 'ko':
                greeting = `안녕하세요, ${name}님! 😊`
                break
            case 'en':
                greeting = `Hello, ${name}! 👋`
                break
            case 'ja':
                greeting = `こんにちは、${name}さん！ 😊`
                break
            default:
                greeting = `안녕하세요, ${name}님! 😊`
        }

        return {
            content: [
                {
                    type: 'text',
                    text: greeting
                }
            ]
        }
    }
)

// Calculator tool
server.tool(
    'calculator',
    {
        operation: z
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .describe('수행할 연산 (add: 더하기, subtract: 빼기, multiply: 곱하기, divide: 나누기)'),
        a: z.number().describe('첫 번째 숫자'),
        b: z.number().describe('두 번째 숫자')
    },
    async ({ operation, a, b }) => {
        let result: number
        let operationSymbol: string
        
        switch (operation) {
            case 'add':
                result = a + b
                operationSymbol = '+'
                break
            case 'subtract':
                result = a - b
                operationSymbol = '-'
                break
            case 'multiply':
                result = a * b
                operationSymbol = '×'
                break
            case 'divide':
                if (b === 0) {
                    throw new Error('0으로 나눌 수 없습니다')
                }
                result = a / b
                operationSymbol = '÷'
                break
            default:
                throw new Error('지원하지 않는 연산입니다')
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `${a} ${operationSymbol} ${b} = ${result}`
                }
            ]
        }
    }
)

// Time tool
server.tool(
    'get_time',
    {
        timeZone: z.string().optional().describe('시간대 (예: Asia/Seoul, America/New_York, Europe/London). 기본값: 시스템 시간대'),
        format: z.enum(['full', 'date', 'time', 'iso']).optional().default('full').describe('시간 형식 (full: 전체, date: 날짜만, time: 시간만, iso: ISO 형식)')
    },
    async ({ timeZone, format }) => {
        const now = new Date()
        
        let timeString: string
        
        switch (format) {
            case 'date':
                timeString = now.toLocaleDateString('ko-KR', {
                    timeZone: timeZone || undefined,
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                })
                break
            case 'time':
                timeString = now.toLocaleTimeString('ko-KR', {
                    timeZone: timeZone || undefined,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                })
                break
            case 'iso':
                timeString = now.toISOString()
                break
            case 'full':
            default:
                timeString = now.toLocaleString('ko-KR', {
                    timeZone: timeZone || undefined,
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                })
                break
        }

        const timeZoneInfo = timeZone ? ` (${timeZone})` : ' (시스템 시간대)'
        
        return {
            content: [
                {
                    type: 'text',
                    text: `현재 시간${timeZoneInfo}: ${timeString}`
                }
            ]
        }
    }
)

// Server info resource
server.resource(
    'server://info',
    'server://info',
    {
        name: '서버 정보',
        description: 'MCP 서버의 기본 정보와 스펙을 제공합니다',
        mimeType: 'application/json'
    },
    async () => {
        const serverInfo = {
            name: 'greeting-mcp-server',
            version: '1.0.0',
            description: '인사, 계산기, 시간 조회 기능을 제공하는 MCP 서버',
            capabilities: {
                tools: [
                    {
                        name: 'greeting',
                        description: '다국어 인사 기능 (한국어, 영어, 일본어)',
                        parameters: {
                            name: 'string - 인사할 사람의 이름',
                            language: 'enum - 인사 언어 (ko, en, ja)'
                        }
                    },
                    {
                        name: 'calculator',
                        description: '사칙연산 계산기',
                        parameters: {
                            operation: 'enum - 연산 종류 (add, subtract, multiply, divide)',
                            a: 'number - 첫 번째 숫자',
                            b: 'number - 두 번째 숫자'
                        }
                    },
                    {
                        name: 'get_time',
                        description: '시간 조회 기능',
                        parameters: {
                            timeZone: 'string - 시간대 (선택)',
                            format: 'enum - 시간 형식 (full, date, time, iso)'
                        }
                    }
                ],
                resources: [
                    {
                        name: 'server://info',
                        description: '서버 정보 조회'
                    }
                ]
            },
            runtime: {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                timestamp: new Date().toISOString()
            },
            author: 'MCP Server Developer',
            license: 'ISC'
        }

        return {
            contents: [
                {
                    uri: 'server://info',
                    mimeType: 'application/json',
                    text: JSON.stringify(serverInfo, null, 2)
                }
            ]
        }
    }
)

// Code review prompt
server.prompt(
    'code_review',
    '코드 리뷰 요청',
    {
        code: z.string().describe('리뷰할 코드'),
        language: z.string().optional().describe('프로그래밍 언어 (예: javascript, typescript, python, java 등)'),
        focus: z.enum(['quality', 'performance', 'security', 'style', 'all']).optional().describe('리뷰 포커스 (quality: 코드 품질, performance: 성능, security: 보안, style: 스타일, all: 전체)')
    },
    async ({ code, language, focus = 'all' }) => {
        const languageInfo = language ? ` (${language})` : ''
        const focusInfo = focus !== 'all' ? ` - ${focus} 중심` : ''
        
        const reviewPrompt = `다음${languageInfo} 코드를 분석하고 상세한 리뷰를 제공해주세요${focusInfo}:

\`\`\`${language || ''}
${code}
\`\`\`

리뷰 항목:
1. **코드 품질**: 가독성, 구조, 모듈화
2. **성능**: 효율성, 최적화 가능한 부분
3. **보안**: 잠재적 보안 취약점
4. **스타일**: 코딩 컨벤션, 네이밍
5. **개선 제안**: 구체적인 개선 방안
6. **모범 사례**: 해당 언어/프레임워크의 모범 사례

각 항목별로 구체적인 예시와 함께 설명해주세요.`

        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: reviewPrompt
                    }
                }
            ]
        }
    }
)

// Start server
async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('Greeting MCP 서버가 시작되었습니다!')
}

main().catch(error => {
    console.error('서버 시작 중 오류 발생:', error)
    process.exit(1)
})
