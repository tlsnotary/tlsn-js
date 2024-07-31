const json = `{"a":{"a1":"hello","a2":"world","a3":3333},"d":{"dog":"puppy"},"b":"banana","c":12343,"e":[1,"2"]}`;

console.log('================================================');
console.log(json);

function parse(str) {
  const stack = [];
  const values = [];
  const keys = [];
  let nonce = 0,
    keyId = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    let last = stack[stack.length - 1];

    if (last?.type === 'object_key') {
      if (char === '"') {
        last.range[1] = i;
        const key = stack.pop();
        keys.push(key.data);
        key.path = keys.join('.');
        values.push(key);
        keyId = last.id;
      } else {
        last.data = last.data + char;
      }
      continue;
    }

    if (last?.type === 'object_value_string') {
      if (char === '"') {
        last.range[1] = i;
        values.push(stack.pop());
        const objectValue = stack.pop();
        objectValue.range[1] = i;
        values.push(objectValue);
        keys.pop();
      } else {
        last.data = last.data + char;
      }
      continue;
    }

    if (last?.type === 'array') {
      if (char === ']') {
        last.range[1] = i;
        values.push(stack.pop());
      } else if (char === '[') {
        stack.push({
          symbol: '[',
          type: 'array',
          id: nonce++,
          range: [i],
        });
      } else {
        last.data = last.data + char;
      }
      continue;
    }

    if (last?.type === 'object_value_number') {
      if (char === ',' || char === '}') {
        last.range[1] = i - 1;
        values.push(stack.pop());
        const objectValue = stack.pop();
        objectValue.range[1] = i - 1;
        values.push(objectValue);
        last = stack[stack.length - 1];
      } else {
        last.data = last.data + char;
        continue;
      }
    }

    if (last?.type === 'object_value') {
      if (char === '}') {
        last.range[1] = i;
        values.push(stack.pop());
        const object = stack.pop();
        object.range[1] = i;
        values.push(object);
        keys.pop();
      } else if (char === ',') {
        last.range[1] = i;
        values.push(stack.pop());
        keys.pop();
      } else if (char === '{') {
        stack.push({
          symbol: '{',
          type: 'object',
          id: nonce++,
          range: [i],
        });
      } else if (char === '[') {
        stack.push({
          symbol: '[',
          type: 'array',
          id: nonce++,
          range: [i],
          data: '',
        });
      } else if (char === '"') {
        stack.push({
          symbol: '"',
          type: 'object_value_string',
          objectId: last.objectId,
          valueId: last.id,
          id: nonce++,
          data: '',
          range: [i],
        });
      } else if (/^\d$/.test(char)) {
        stack.push({
          symbol: '"',
          type: 'object_value_number',
          objectId: last.objectId,
          valueId: last.id,
          id: nonce++,
          data: '',
          range: [i],
        });
      }
      continue;
    }

    if (last?.type === 'object') {
      switch (char) {
        case '}':
          last.range[1] = i;
          values.push(stack.pop());
          continue;
        case '"':
          stack.push({
            symbol: '"',
            type: 'object_key',
            objectId: last.id,
            id: nonce++,
            data: '',
            range: [i],
          });
          continue;
        case ':':
          stack.push({
            symbol: ':',
            type: 'object_value',
            objectId: last.id,
            keyId: keyId,
            id: nonce++,
            range: [i],
          });
          continue;
        default:
          continue;
      }
    }

    switch (char) {
      case '{':
        stack.push({
          symbol: '{',
          type: 'object',
          id: nonce++,
          range: [i],
        });
        break;
      case '[':
        stack.push({
          symbol: '[',
          type: 'array',
          id: nonce++,
          range: [i],
        });
        break;
    }
  }

  const commitments = {};

  for (let value of values) {
    if (value.type === 'object_key') {
      commitments[value.id] = {
        ...(commitments[value.id] || {}),
        type: 'keyValue',
        path: value.path,
        start: value.range[0],
      };
    } else if (value.type === 'object_value') {
      commitments[value.keyId] = {
        ...(commitments[value.keyId] || {}),
        type: 'keyValue',
        end: value.range[1] + 1,
      };
    } else if (value.type === 'object') {
      commitments[value.id] = {
        type: 'object',
        start: value.range[0],
        end: value.range[1] + 1,
      };
    } else if (value.type === 'array') {
      commitments[value.id] = {
        type: 'array',
        start: value.range[0],
        end: value.range[1] + 1,
      };
    }
  }

  console.log('================================================');
  console.log('stack:  ', stack);
  console.log('values: ', values);
  console.log('================================================');
  return commitments;
}

const commitments = parse(json);

console.log(
  Object.values(commitments).map(({ path, start, end }) => [
    path,
    json.slice(start, end),
    start,
    end,
  ]),
);

function expect(cond, msg = 'invalid expression') {
  if (!cond) throw new Error(msg);
}
