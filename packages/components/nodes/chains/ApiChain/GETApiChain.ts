import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { PromptTemplate } from '@langchain/core/prompts'
import { APIChain } from 'langchain/chains'
import { getBaseClasses } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { BaseLLMOutputParser, BaseOutputParser } from '@langchain/core/output_parsers'
import { OutputFixingParser } from 'langchain/output_parsers'
// import { injectOutputParser } from '../../outputparsers/OutputParserHelpers' FELI

export const API_URL_RAW_PROMPT_TEMPLATE = `You are given the below API Documentation:
{api_docs}
Using this documentation, generate the full API url to call for answering the user question.
You should build the API url in order to get a response that is as short as possible, while still getting the necessary information to answer the question. Pay attention to deliberately exclude any unnecessary pieces of data in the API call.

Question:{question}
API url:`

export const API_RESPONSE_RAW_PROMPT_TEMPLATE =
    'Given this {api_response} response for {api_url}. use the given response to answer this {question}'

class GETApiChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]
    outputParser: BaseOutputParser

    constructor() {
        this.label = 'GET API Chain'
        this.name = 'getApiChain'
        this.version = 1.0
        this.type = 'GETApiChain'
        this.icon = 'get.svg'
        this.category = 'Chains'
        this.description = 'Chain to run queries against GET API'
        this.baseClasses = [this.type, ...getBaseClasses(APIChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Output Parser',
                name: 'outputParser',
                type: 'BaseLLMOutputParser',
                optional: true
            },
            {
                label: 'API Documentation',
                name: 'apiDocs',
                type: 'string',
                description:
                    'Description of how API works. Please refer to more <a target="_blank" href="https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain/chains/api/open_meteo_docs.py">examples</a>',
                rows: 4
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'json',
                additionalParams: true,
                optional: true
            },
            {
                label: 'URL Prompt',
                name: 'urlPrompt',
                type: 'string',
                description: 'Prompt used to tell LLMs how to construct the URL. Must contains {api_docs} and {question}',
                default: API_URL_RAW_PROMPT_TEMPLATE,
                rows: 4,
                additionalParams: true
            },
            {
                label: 'Answer Prompt',
                name: 'ansPrompt',
                type: 'string',
                description:
                    'Prompt used to tell LLMs how to return the API response. Must contains {api_response}, {api_url}, and {question}',
                default: API_RESPONSE_RAW_PROMPT_TEMPLATE,
                rows: 4,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const apiDocs = nodeData.inputs?.apiDocs as string
        const headers = nodeData.inputs?.headers as string
        const urlPrompt = nodeData.inputs?.urlPrompt as string
        const ansPrompt = nodeData.inputs?.ansPrompt as string
        const outputParser = nodeData.inputs?.outputParser as BaseOutputParser
        console.log('llmOutputParser FELIIII', outputParser)
        this.outputParser = outputParser
        if (outputParser) {
            let autoFix = (outputParser as any).autoFix
            if (autoFix === true) {
                this.outputParser = OutputFixingParser.fromLLM(model, outputParser)
            }
        }

        const chain = await getAPIChain(apiDocs, model, outputParser, headers, urlPrompt, ansPrompt)
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const apiDocs = nodeData.inputs?.apiDocs as string
        const headers = nodeData.inputs?.headers as string
        const urlPrompt = nodeData.inputs?.urlPrompt as string
        const ansPrompt = nodeData.inputs?.ansPrompt as string
        // let promptValues: ICommonObject | undefined = nodeData.inputs?.prompt.promptValues as ICommonObject

        const outputParser = nodeData.inputs?.outputParser as BaseOutputParser
        if (!this.outputParser && outputParser) {
            this.outputParser = outputParser
        }
        console.log('llmOutputParser in RUN FELII', outputParser)
        console.log('this.llmOutputParser FELII', this.outputParser)

        const chain = await getAPIChain(apiDocs, model, outputParser, headers, urlPrompt, ansPrompt)
        // promptValues = injectOutputParser(this.outputParser, chain.apiAnswerChain, promptValues)

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        let res
        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId, 2)
            res = await chain.run(input, [loggerHandler, handler, ...callbacks])
        } else {
            res = await chain.run(input, [loggerHandler, ...callbacks])
        }
        console.log('res in RUN FELIII', res)

        let finalRes = res
        if (this.outputParser && typeof res === 'object' && Object.prototype.hasOwnProperty.call(res, 'json')) {
            finalRes = (res as ICommonObject).json
        }

        return finalRes
    }
}

const getAPIChain = async (
    documents: string,
    llm: BaseLanguageModel,
    outputParser: BaseLLMOutputParser,
    headers: string,
    urlPrompt: string,
    ansPrompt: string
) => {
    const apiUrlPrompt = new PromptTemplate({
        inputVariables: ['api_docs', 'question'],
        template: urlPrompt ? urlPrompt : API_URL_RAW_PROMPT_TEMPLATE
    })

    const apiResponsePrompt = new PromptTemplate({
        inputVariables: ['api_docs', 'question', 'api_url', 'api_response'],
        template: ansPrompt ? ansPrompt : API_RESPONSE_RAW_PROMPT_TEMPLATE
    })
    if (outputParser) {
        console.log('outputParser in GETAPICHAIN FELIII', outputParser)
    }

    // TODO FELI: outputParser is not being passed to the APIChain (lbh tepatnya dr APIChain gbs di-console log so idk if it's being passed or not)
    // Look at postCore.ts

    const chain = APIChain.fromLLMAndAPIDocs(llm, documents, {
        apiUrlPrompt,
        apiResponsePrompt,
        outputParser,
        verbose: process.env.DEBUG === 'true' ? true : false,
        headers: typeof headers === 'object' ? headers : headers ? JSON.parse(headers) : {}
    })
    console.log('chain in GETAPICHAIN FELIII', chain)

    return chain
}

module.exports = { nodeClass: GETApiChain_Chains }
