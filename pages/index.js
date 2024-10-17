import Messages from "components/messages";
import PromptForm from "components/prompt-form";
import Head from "next/head";
import { useEffect, useState } from "react";
import Footer from "components/footer";
import prepareImageFileForUpload from "lib/prepare-image-file-for-upload";
import { getRandomSeed } from "lib/seeds";
import axios from 'axios';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const appName = "Edición por prompts";
export const appSubtitle = "";
export const appMetaDescription = "";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [seed] = useState(getRandomSeed());
  const [initialPrompt, setInitialPrompt] = useState(seed.prompt);

  useEffect(() => {
    setEvents([{ image: seed.image }]);
  }, [seed.image]);

  const handleImageDropped = async (image) => {
    try {
      image = await prepareImageFileForUpload(image);
    } catch (error) {
      setError(error.message);
      return;
    }
    setEvents(events.concat([{ image }]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const prompt = e.target.prompt.value;
    const lastImage = events.findLast((ev) => ev.image)?.image;

    setError(null);
    setIsProcessing(true);
    setInitialPrompt("");

    const myEvents = [...events, { prompt }];
    setEvents(myEvents);

    try {
      const response = await axios.post('https://back.civersia.com/editor', {
        prompt,
        image: lastImage
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.processedImage) {
        setEvents(myEvents.concat([{ image: response.data.processedImage }]));
      } else {
        throw new Error('No se recibió una imagen procesada');
      }
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      setError(error.message || 'Error en el procesamiento de la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  const startOver = (e) => {
    e.preventDefault();
    setEvents(events.slice(0, 1));
    setError(null);
    setIsProcessing(false);
    setInitialPrompt(seed.prompt);
  };

  return (
    <div>
      <Head>
        <title>{appName}</title>
        <meta name="description" content={appMetaDescription} />
        <meta property="og:title" content={appName} />
        <meta property="og:description" content={appMetaDescription} />
      </Head>

      <main className="container max-w-[700px] mx-auto p-5">
        <hgroup>
          <h1 className="text-center text-5xl font-bold m-6">{appName}</h1>
          <p className="text-center text-xl opacity-60 m-6">
            {appSubtitle}
          </p>
        </hgroup>

        <Messages
          events={events}
          isProcessing={isProcessing}
          onUndo={(index) => {
            setInitialPrompt(events[index - 1].prompt);
            setEvents(
              events.slice(0, index - 1).concat(events.slice(index + 1))
            );
          }}
        />

        <PromptForm
          initialPrompt={initialPrompt}
          isFirstPrompt={events.length === 1}
          onSubmit={handleSubmit}
          disabled={isProcessing}
        />

        <div className="mx-auto w-full">
          {error && <p className="bold text-red-500 pb-5">{error}</p>}
        </div>

        <Footer
          events={events}
          startOver={startOver}
          handleImageDropped={handleImageDropped}
        />
      </main>
    </div>
  );
}