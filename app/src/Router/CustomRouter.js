import { Router } from "express";
import { verifyToken } from "../utils/token.util.js";
import usersRepository from "../repositories/users.rep.js";
import winston from "../utils/wisnton.util.js";
// import usersManager from "../data/mongo/UsersManager.mongo.js";

class CustomRouter {
   // para construir y configurar cada instancia del enrutador
   constructor() {
      this.router = Router();
      this.init();
   }
   // para obtener todas las rutas del enrutador definido
   getRouter() {
      return this.router;
   }
   // para inicializar las clases/propiedades heredadas cuando tenemos subrouters
   init() {}
   // para manejar las callbacks de middlewares y las cbs finales
   applyCbs(callbacks) {
      return callbacks.map((callback) => async (...params) => {
         try {
            await callback.apply(this, params);
         } catch (error) {
            return params[2](error);
         }
      });
   }

   // DEFINIMOS RESPUESTAS DEFAULT PARA NUESTRO SERVIDOR

   response = (req, res, next) => {
      res.response200 = (response) => res.json({ statusCode: 200, response });
      res.message200 = (message) => res.json({ statusCode: 200, message });
      res.paginate = (response, info) =>
         res.json({ statusCode: 200, response, info });
      res.response201 = (response) => res.json({ statusCode: 201, response });
      res.error400 = (message) => {
         const errorMessage = `${req.method} ${
            req.url
         } 400 - ${new Date().toLocaleTimeString()} - ${message}`;
         winston.ERROR(errorMessage);
         return res.json({ statusCode: 400, message });
      };
      res.error401 = () => {
         const errorMessage = `${req.method} ${
            req.url
         } 401 - ${new Date().toLocaleTimeString()} - Bad Auth from policies`;
         winston.ERROR(errorMessage);
         return res.json({ statusCode: 401, message: "Bad Auth from policies" });
      };
      res.error403 = () => {
         const errorMessage = `${req.method} ${
            req.url
          } 403 - ${new Date().toLocaleTimeString()} - Forbidden from policies`;
          winston.ERROR(errorMessage);
         return res.json({ statusCode: 401, message: "Forbidden from policies" });}
      res.error404 = () => {
         const errorMessage = `${req.method} ${
            req.url
          } 404 - ${new Date().toLocaleTimeString()} -not found docs`;
          winston.ERROR(errorMessage);
         return res.json({ statusCode: 404, message: "not found docs" });}
      return next();
   };

   policies = (policies) => async (req, res, next) => {
      if (policies.includes("PUBLIC")) return next();
      else {
         let token = req.cookies["token"];
         if (!token) return res.error401();
         else {
            try {
               token = verifyToken(token);
               const { role, email } = token;
               if (
                  (policies.includes("USER") && role === 0) ||
                  (policies.includes("ADMIN") && role === 1)
               ) {
                  const user = await usersRepository.readByEmailRepository(
                     email
                  );
                  //proteger contraseña del usuario!!!
                  req.user = user;
                  return next();
               } else return res.error403();
            } catch (error) {
               return res.error400(error.message);
            }
         }
      }
   };

   // create("/products", isValidAdmin, isText, create)
   create(path, arrayOfPolicies, ...callbacks) {
      this.router.post(
         path,
         this.response,
         this.policies(arrayOfPolicies),
         this.applyCbs(callbacks)
      );
   }
   read(path, arrayOfPolicies, ...callbacks) {
      this.router.get(
         path,
         this.response,
         this.policies(arrayOfPolicies),
         this.applyCbs(callbacks)
      );
   }
   update(path, arrayOfPolicies, ...callbacks) {
      this.router.put(
         path,
         this.response,
         this.policies(arrayOfPolicies),
         this.applyCbs(callbacks)
      );
   }
   destroy(path, arrayOfPolicies, ...callbacks) {
      this.router.delete(
         path,
         this.response,
         this.policies(arrayOfPolicies),
         this.applyCbs(callbacks)
      );
   }
   use(path, ...callbacks) {
      this.router.use(path, this.response, this.applyCbs(callbacks));
   }
}

export default CustomRouter;
