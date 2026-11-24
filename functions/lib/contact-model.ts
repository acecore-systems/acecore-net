import registry from '../../config/ai-models.generated.json'
const selection = registry.features['acecore-net.contact.generation']
if (
  registry.schema_version !== 1 ||
  selection?.profile !== 'text.default' ||
  selection.provider !== 'meta' ||
  selection.execution_mode !== 'realtime' ||
  typeof selection.api_model_id !== 'string' ||
  !/^[a-z0-9][a-z0-9._-]*$/u.test(selection.api_model_id)
) {
  throw new Error('Invalid contact model policy')
}
export const CONTACT_META_MODEL = selection.api_model_id

// This Pages environment value keeps its routing meaning across model updates.
export const LEGACY_CONTACT_META_ROUTE = 'muse-ember-1.0'
