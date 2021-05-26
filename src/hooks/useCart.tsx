import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExistsInTheCart = cart.find(
        (product) => product.id === productId
      );

      if (productExistsInTheCart !== undefined) {
        updateProductAmount({
          productId: productExistsInTheCart.id,
          amount: productExistsInTheCart.amount + 1,
        });
      } else {
        const stock: Stock = await api
          .get(`/stock/${productId}`)
          .then(({ data }) => data);

        if (stock.amount <= 0) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newProduct = await api
          .get(`/products/${productId}`)
          .then(({ data }) => data);
        const updatedCart = [...cart, { ...newProduct, amount: 1 }];
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        return;
      }
    } catch {
      toast.error('Erro na adição do produto');
      return;
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.reduce((cart, product) => {
        if (product.id === productId) {
          return cart;
        } else {
          return [...cart, product];
        }
      }, [] as Product[]);

      if (updatedCart.length === cart.length) {
        throw new Error();
      } else {
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        return;
      }
    } catch {
      toast.error('Erro na remoção do produto');
      return;
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error();
      }

      const product = cart.find((product) => product.id === productId);

      if (product === undefined) {
        throw new Error();
      }

      const updatedCart = [...cart];

      if (product.amount < amount) {
        const stock: Stock = await api
          .get(`/stock/${productId}`)
          .then(({ data }) => data);

        if (stock.amount < amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        updatedCart.forEach((product) => {
          if (product.id === productId) {
            product.amount = amount;
          }
        });
      } else {
        const updatedCart = [...cart];
        updatedCart.forEach((product) => {
          if (product.id === productId) {
            product.amount = amount;
          }
        });
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      return;
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
      return;
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
