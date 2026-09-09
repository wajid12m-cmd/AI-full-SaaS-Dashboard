type ButtonProps = {
  text: string;
};

export default function Button({ text }: ButtonProps) {
  return (
    <button className="bg-blue-600 text-white px-4 py-2 rounded">
      {text}
    </button>
  );
}