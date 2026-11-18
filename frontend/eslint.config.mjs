import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'java-backend/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
