import { PoliciesPageContent } from '../../PoliciesClient';

export default async function EditPolicyPage({ params }) {
  const { name } = await params;

  return (
    <PoliciesPageContent
      editorOnly
      initialEditName={decodeURIComponent(name)}
    />
  );
}
