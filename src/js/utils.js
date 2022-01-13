import basex from 'base-x';

export const base58 = basex('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

export function findDPathError(path, isUsingEd25519 = false) {
    const maxDepth = 255;
    const maxIndexValue = Math.pow(2, 31);

    if (path[0] != 'm')
        return 'First character must be \'m\'';

    if (path.length > 1) {
        if (path[1] != '/')
            return 'Separator must be \'/\'';

        const indexes = path.split('/');

        if (indexes.length > maxDepth)
            return `Derivation depth is ${indexes.length}, must be less than ${maxDepth}`;

        for (let depth = 1; depth < indexes.length; depth++) {
            const index = indexes[depth];

            if (index === '')
                return `No value at depth ${depth}`;

            const invalidChars = index.replace(/^[0-9]+'?$/g, '');

            if (invalidChars.length > 0)
                return `Invalid characters '${invalidChars}' found at depth ${depth}`;

            const indexValue = parseInt(index.replace('\'', ''));

            if (isNaN(depth))
                return `Invalid number at depth ${depth}`;
            
            if (indexValue > maxIndexValue)
                return `Value of ${indexValue} at depth ${depth} must be less than ${maxIndexValue}`;
        }
    }

    if (isUsingEd25519) {
        const indexes = path.split('/');

        if (indexes.find((v, i) => i > 0 && !v.endsWith('\''))) {
            return 'All params must be hardened';
        }
    }

    return false;
};
