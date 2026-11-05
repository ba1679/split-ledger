/** Format the server's exact decimal string without passing through a Number. */
export function displayAmount(amount: string) {
  const [whole = '', fraction] = amount.split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction === undefined ? '' : `.${fraction}`}`;
}
