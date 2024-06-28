import { ICommonObject, INode, INodeData, INodeParams, PromptTemplate } from '../../../src/Interface'
import { getBaseClasses, getInputVariables } from '../../../src/utils'
import { PromptTemplateInput } from '@langchain/core/prompts'
import { parseJSONEscapeTags } from './ParseJSONEsc'

class CurlyPromptTemplate_Prompts implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Curly Prompt Template'
        this.name = 'curlypromptTemplate'
        this.version = 1.0
        this.type = 'CurlyPromptTemplate'
        this.icon = 'prompt.svg'
        this.category = 'Prompts'
        this.description =
            'Schema to represent a basic prompt for an LLM, but with the added ability to prevent JSON from being recognized as a variable.'
        this.baseClasses = [...getBaseClasses(PromptTemplate)]
        this.inputs = [
            {
                label: 'Template',
                name: 'template',
                type: 'string',
                rows: 4,
                placeholder: `What is a good name for a company that makes {product}?`
            },
            {
                label: 'Format Prompt Values',
                name: 'promptValues',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const template = nodeData.inputs?.template as string
        const promptValuesStr = nodeData.inputs?.promptValues
        const JFBParsedTemplate = parseJSONEscapeTags(template)

        let promptValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                promptValues = typeof promptValuesStr === 'object' ? promptValuesStr : JSON.parse(promptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the PromptTemplate's promptValues: " + exception)
            }
        }

        const inputVariables = getInputVariables(JFBParsedTemplate)

        try {
            const options: PromptTemplateInput = {
                template: JFBParsedTemplate,
                inputVariables
            }
            const prompt = new PromptTemplate(options)
            prompt.promptValues = promptValues
            return prompt
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: CurlyPromptTemplate_Prompts }
