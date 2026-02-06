import { encryptPassword } from '../api';

/**
 * 加密数据库节点和enc_password字段中的密码字段
 * @param nodes 工作流节点数组
 * @returns 处理后的节点数组
 */
export const encryptDatabasePasswords = async (nodes: any[]): Promise<any[]> => {
  const processedNodes = [...nodes];
  let databaseNodesFound = 0;
  let encPasswordFieldsFound = 0;
  let passwordsEncrypted = 0;

  for (const node of processedNodes) {
    if (node.flowNodeType === 'pluginModule') {
      // 1. 处理数据库连接插件的密码字段
      const isDatabasePlugin = node.pluginId === 'community-databaseConnection';

      if (isDatabasePlugin) {
        databaseNodesFound++;

        // 查找数据库密码相关的输入参数
        const passwordInputs = node.inputs?.filter(
          (input: any) =>
            input.key === 'password' ||
            input.key === 'databasePwd' ||
            input.key === 'databasePwd-H' ||
            input.key.includes('password') ||
            input.key.includes('pwd')
        );

        for (const passwordInput of passwordInputs || []) {
          // 检查是否是字符串类型的密码值
          const passwordValue = passwordInput.value;
          const isStringPassword = typeof passwordValue === 'string';
          const isAlreadyEncrypted = isStringPassword && passwordValue.startsWith('ENC-');

          if (isStringPassword && passwordValue && !isAlreadyEncrypted) {
            try {
              // 调用加密API
              const response = await encryptPassword({
                password: passwordInput.value
              });

              // 检查响应格式
              const encryptedPassword = response?.encryptedPassword;
              if (!encryptedPassword) {
                continue;
              }

              // 更新密码为加密格式
              passwordInput.value = encryptedPassword;
              passwordsEncrypted++;
            } catch (error) {
              // 如果加密失败，保持原密码不变
            }
          }
        }
      }

      // 2. 处理所有pluginModule中的enc_password字段
      const encPasswordInputs = node.inputs?.filter((input: any) => input.key === 'enc_password');

      if (encPasswordInputs && encPasswordInputs.length > 0) {
        encPasswordFieldsFound++;

        for (const encPasswordInput of encPasswordInputs) {
          // 检查是否是字符串类型的密码值
          const passwordValue = encPasswordInput.value;
          const isStringPassword = typeof passwordValue === 'string';
          const isAlreadyEncrypted = isStringPassword && passwordValue.startsWith('ENC-');

          if (isStringPassword && passwordValue && !isAlreadyEncrypted) {
            try {
              // 调用加密API
              const response = await encryptPassword({
                password: encPasswordInput.value
              });

              // 检查响应格式
              const encryptedPassword = response?.encryptedPassword;
              if (!encryptedPassword) {
                continue;
              }

              // 更新密码为加密格式
              encPasswordInput.value = encryptedPassword;
              passwordsEncrypted++;
            } catch (error) {
              // 如果加密失败，保持原密码不变
            }
          }
        }
      }
    }
  }

  console.log(
    `🔍 Summary: Found ${databaseNodesFound} database nodes, ${encPasswordFieldsFound} enc_password fields, encrypted ${passwordsEncrypted} passwords`
  );
  return processedNodes;
};
