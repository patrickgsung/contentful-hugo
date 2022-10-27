/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    BLOCKS,
    MARKS,
    INLINES,
    Document,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Heading6,
    Paragraph,
    Quote,
    OrderedList,
    UnorderedList,
    Hr,
    Hyperlink,
} from '@contentful/rich-text-types';
import {
    documentToHtmlString,
    Next,
} from '@contentful/rich-text-html-renderer';
import {
    isMultilineString,
    replaceSpecialEntities,
    leadingSpaces,
    trailingSpaces,
} from '@helpers/strings';
import { Entry, Asset } from 'contentful';
import { AssetObject } from './getAssetFields';

const mapEntry = (target: Entry<any>) => ({
    id: target.sys.id,
    // contentType doesn't exist if the entry is "missing or inaccessible"
    contentType: target.sys.contentType?.sys?.id,
});

const mapAsset = (target: Asset) => {
    const { title, description, file } = target.fields;
    const { url, details, fileName, contentType } = file;
    const asset: AssetObject = {
        title,
        description,
        url,
        fileName,
        assetType: contentType,
        size: details.size,
        width: null,
        height: null,
    };
    if (details.image && details.image.width && details.image.height) {
        asset.width = details.image.width;
        asset.height = details.image.height;
    }
    return asset;
};

const optionsRenderNode = (parentContentType = ''): any => ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [BLOCKS.EMBEDDED_ASSET]: (node: any, next: Next) => {
        const {
            title,
            description,
            url,
            fileName,
            assetType,
            size,
            width,
            height,
        } = mapAsset(node.data.target);
        const handleQuotes = (string: string) => {
            // eslint-disable-next-line prefer-regex-literals
            const regex = new RegExp(/"/, 'g');
            return string.replace(regex, '\\"');
        };

        return `{{< contentful-hugo/embedded-asset title="${handleQuotes(
            title
        )}" description="${handleQuotes(description || '') || ''}" url="${
            url || ''
        }" filename="${fileName || ''}" assetType="${assetType || ''}" size="${
            size || ''
        }" width="${width || ''}" height="${height || ''}" parentContentType="${
            parentContentType || ''
        }" >}}\n\n`;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [BLOCKS.EMBEDDED_ENTRY]: (node: any, next: Next) => {
        const { id, contentType } = mapEntry(node.data.target);
        return `{{< contentful-hugo/embedded-entry id="${id}" contentType="${contentType}" parentContentType="${
            parentContentType || ''
        }" >}}\n\n`;
    },
    [INLINES.HYPERLINK]: (node: Hyperlink, next: Next) =>
        `<a href="${node.data.uri}" target="_blank">${next(node.content)}</a>`,
    [INLINES.ASSET_HYPERLINK]: (node: any, next: Next) => {
        const {
            title,
            description,
            url,
            fileName,
            assetType,
            size,
            width,
            height,
        } = mapAsset(node.data.target);
        return `{{< contentful-hugo/asset-hyperlink title="${title}" description="${
            description || ''
        }" url="${url || ''}" filename="${fileName || ''}" assetType="${
            assetType || ''
        }" size="${size || ''}" width="${width || ''}" height="${
            height || ''
        }" parentContentType="${parentContentType || ''}" >}}${next(
            node.content
        )}{{< /contentful-hugo/asset-hyperlink >}}`;
    },
    [INLINES.ENTRY_HYPERLINK]: (node: any, next: Next) => {
        const { id, contentType } = mapEntry(node.data.target);
        return `{{< contentful-hugo/entry-hyperlink id="${id}" contentType="${contentType}" parentContentType="${
            parentContentType || ''
        }" >}}${next(node.content)}{{< /contentful-hugo/entry-hyperlink >}}`;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [INLINES.EMBEDDED_ENTRY]: (node: any, next: Next) => {
        const { id, contentType } = mapEntry(node.data.target);
        return `{{< contentful-hugo/inline-entry id="${id}" contentType="${contentType}" parentContentType="${
            parentContentType || ''
        }" >}}`;
    },
});

const sanitizedMarkOutput = (
    input: string,
    markWrapper: '__' | '_' | '**' | '*'
): string => {
    const leading = leadingSpaces(input);
    const trailing = trailingSpaces(leading.newString);
    return `${leading.removedSpaces}${markWrapper}${trailing.newString}${markWrapper}${trailing.removedSpaces}`;
};

const options = (parentContentType = '') => ({
    renderMark: {
        [MARKS.BOLD]: (text: string) => sanitizedMarkOutput(text, '**'),
        [MARKS.ITALIC]: (text: string) => sanitizedMarkOutput(text, '_'),
        [MARKS.CODE]: (text: string) => {
            if (isMultilineString(text)) {
                return `\`\`\`\n${text}\n\`\`\``;
            }
            return `\`${text}\``;
        },
    },
    renderNode: optionsRenderNode(parentContentType),
});

/**
 * Convert a contentful richtext field to markdown
 * @param {Object} document - Contentful richtext field
 * @param {String} contentType - Content type id
 */
const richTextToMarkdown = (
    document: Document,
    contentType?: string
): string => {
    const string = documentToHtmlString(document, options(contentType));
    return `\n${replaceSpecialEntities(string)}`;
};

export default richTextToMarkdown;
