function updateNestedField(obj: any, path: string, value: any): any {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, obj);
    lastObj[lastKey!] = value;
    return { ...obj };
  }